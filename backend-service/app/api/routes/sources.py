import io
import re
from html.parser import HTMLParser
from typing import Annotated
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pypdf import PdfReader

from app.api.deps import Principal, get_principal, get_source_repository
from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.repositories.source_repository import SourceRepository
from app.schemas.source import (
    SourceKind,
    SourceLinkRequest,
    SourceResponse,
    SourceSelectAllRequest,
    SourceSelectRequest,
    SourceTextRequest,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/sources", tags=["sources"])

_CONVERSATION_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
_YOUTUBE_PATTERN = re.compile(r"(?:youtube\.com|youtu\.be)/", re.IGNORECASE)
_LINK_FETCH_TIMEOUT_SECONDS = 10.0
_LINK_FETCH_MAX_BYTES = 2 * 1024 * 1024

SourceRepoDep = Annotated[SourceRepository, Depends(get_source_repository)]
PrincipalDep = Annotated[Principal, Depends(get_principal)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


def _validate_conversation_id(conversation_id: str) -> str:
    if not _CONVERSATION_ID_PATTERN.match(conversation_id):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid conversation id.",
        )
    return conversation_id


async def _enforce_source_cap(
    repo: SourceRepository, principal: Principal, conversation_id: str, settings: Settings
) -> None:
    count = await repo.count_for_conversation(principal.kind, principal.id, conversation_id)
    if count >= settings.sources.max_per_conversation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Source limit of {settings.sources.max_per_conversation} reached.",
        )


def _extract_pdf_text(data: bytes) -> str | None:
    """Best effort: an unreadable or image-only PDF becomes a metadata-only source."""
    try:
        reader = PdfReader(io.BytesIO(data))
        pages = [page.extract_text() or "" for page in reader.pages]
        text = "\n".join(pages).strip()
        return text or None
    except Exception:
        logger.warning("sources.pdf_extraction_failed")
        return None


class _TextExtractor(HTMLParser):
    """Collects visible text, skipping script and style blocks."""

    _SKIPPED_TAGS = {"script", "style", "noscript"}

    def __init__(self) -> None:
        super().__init__()
        self._chunks: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in self._SKIPPED_TAGS:
            self._skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in self._SKIPPED_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._skip_depth == 0 and data.strip():
            self._chunks.append(data.strip())

    def text(self) -> str:
        return "\n".join(self._chunks)


async def _fetch_website_text(url: str) -> str | None:
    """Best-effort page fetch; any failure downgrades the source to metadata only."""
    try:
        async with httpx.AsyncClient(
            timeout=_LINK_FETCH_TIMEOUT_SECONDS, follow_redirects=True
        ) as client:
            async with client.stream("GET", url) as response:
                response.raise_for_status()
                raw = bytearray()
                async for chunk in response.aiter_bytes():
                    raw.extend(chunk)
                    if len(raw) > _LINK_FETCH_MAX_BYTES:
                        break
        parser = _TextExtractor()
        parser.feed(bytes(raw).decode("utf-8", errors="replace"))
        text = parser.text().strip()
        return text or None
    except Exception:
        logger.warning("sources.link_fetch_failed", url=url)
        return None


@router.post("/upload", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def upload_source(
    principal: PrincipalDep,
    repo: SourceRepoDep,
    settings: SettingsDep,
    file: Annotated[UploadFile, File()],
    conversation_id: Annotated[str, Form()],
) -> SourceResponse:
    """Store a file source as extracted text; original bytes are never kept."""
    _validate_conversation_id(conversation_id)
    await _enforce_source_cap(repo, principal, conversation_id, settings)

    # Read one byte past the cap so an oversized upload is rejected without
    # buffering an unbounded body (same pattern as image-search).
    data = await file.read(settings.sources.max_file_bytes + 1)
    if len(data) > settings.sources.max_file_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File is too large.",
        )

    content_type = file.content_type or ""
    content: str | None = None
    if content_type == "application/pdf" or (file.filename or "").lower().endswith(".pdf"):
        content = _extract_pdf_text(data)
    elif content_type.startswith("text/") or content_type in (
        "application/json",
        "application/xml",
    ):
        content = data.decode("utf-8", errors="replace").strip() or None
    if content:
        content = content[: settings.sources.max_text_chars]

    return await repo.create(
        principal_kind=principal.kind,
        principal_id=principal.id,
        conversation_id=conversation_id,
        kind="file",
        name=file.filename or "Untitled",
        size=len(data),
        content_type=content_type,
        url=None,
        content=content,
    )


@router.post("/link", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def add_link_source(
    payload: SourceLinkRequest,
    principal: PrincipalDep,
    repo: SourceRepoDep,
    settings: SettingsDep,
) -> SourceResponse:
    await _enforce_source_cap(repo, principal, payload.conversation_id, settings)

    url = payload.url.strip()
    if not re.match(r"^https?://", url, re.IGNORECASE):
        url = f"https://{url}"
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid URL.")

    kind: SourceKind = "youtube" if _YOUTUBE_PATTERN.search(url) else "website"
    # YouTube pages are player chrome, not transcript; store metadata only.
    content = await _fetch_website_text(url) if kind == "website" else None
    if content:
        content = content[: settings.sources.max_text_chars]

    return await repo.create(
        principal_kind=principal.kind,
        principal_id=principal.id,
        conversation_id=payload.conversation_id,
        kind=kind,
        name=re.sub(r"^https?://", "", url, flags=re.IGNORECASE),
        size=len(content) if content else 0,
        content_type="text/html",
        url=url,
        content=content,
    )


@router.post("/text", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def add_text_source(
    payload: SourceTextRequest,
    principal: PrincipalDep,
    repo: SourceRepoDep,
    settings: SettingsDep,
) -> SourceResponse:
    await _enforce_source_cap(repo, principal, payload.conversation_id, settings)

    content = payload.content.strip()[: settings.sources.max_text_chars]
    first_line = content.split("\n", 1)[0]
    name = payload.name or (first_line[:60] + "..." if len(first_line) > 60 else first_line)

    return await repo.create(
        principal_kind=principal.kind,
        principal_id=principal.id,
        conversation_id=payload.conversation_id,
        kind="text",
        name=name,
        size=len(content),
        content_type="text/plain",
        url=None,
        content=content,
    )


@router.get("", response_model=list[SourceResponse])
async def list_sources(
    principal: PrincipalDep,
    repo: SourceRepoDep,
    conversation_id: str,
) -> list[SourceResponse]:
    _validate_conversation_id(conversation_id)
    return await repo.list_for_conversation(principal.kind, principal.id, conversation_id)


# Declared before the /{source_id} route so "select-all" never binds as an id.
@router.patch("/select-all", response_model=list[SourceResponse])
async def select_all_sources(
    payload: SourceSelectAllRequest,
    principal: PrincipalDep,
    repo: SourceRepoDep,
) -> list[SourceResponse]:
    return await repo.set_all_selected(
        principal.kind, principal.id, payload.conversation_id, payload.is_selected
    )


@router.patch("/{source_id}", response_model=SourceResponse)
async def update_source(
    source_id: str,
    payload: SourceSelectRequest,
    principal: PrincipalDep,
    repo: SourceRepoDep,
) -> SourceResponse:
    updated = await repo.set_selected(source_id, principal.kind, principal.id, payload.is_selected)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
    return updated


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_source(
    source_id: str,
    principal: PrincipalDep,
    repo: SourceRepoDep,
) -> None:
    deleted = await repo.delete(source_id, principal.kind, principal.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
