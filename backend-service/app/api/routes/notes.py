import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import Principal, get_note_repository, get_principal
from app.repositories.note_repository import NoteRepository
from app.schemas.note import NoteCreateRequest, NoteResponse, NoteUpdateRequest

router = APIRouter(prefix="/notes", tags=["notes"])

_CONVERSATION_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,64}$")

NoteRepoDep = Annotated[NoteRepository, Depends(get_note_repository)]
PrincipalDep = Annotated[Principal, Depends(get_principal)]


@router.get("", response_model=list[NoteResponse])
async def list_notes(
    principal: PrincipalDep,
    repo: NoteRepoDep,
    conversation_id: str,
) -> list[NoteResponse]:
    if not _CONVERSATION_ID_PATTERN.match(conversation_id):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid conversation id.",
        )
    return await repo.list_for_conversation(principal.kind, principal.id, conversation_id)


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    payload: NoteCreateRequest,
    principal: PrincipalDep,
    repo: NoteRepoDep,
) -> NoteResponse:
    return await repo.create(principal.kind, principal.id, payload.conversation_id, payload.content)


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    payload: NoteUpdateRequest,
    principal: PrincipalDep,
    repo: NoteRepoDep,
) -> NoteResponse:
    updated = await repo.update_content(note_id, principal.kind, principal.id, payload.content)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return updated


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: str,
    principal: PrincipalDep,
    repo: NoteRepoDep,
) -> None:
    deleted = await repo.delete(note_id, principal.kind, principal.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
