from datetime import datetime, timezone
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.admin_auth import require_admin_user

router = APIRouter(prefix="/api/v1/admin/verification", tags=["Admin Document Verification"])

_IN_MEMORY_VERIFICATION_QUEUE: list[dict] = [
    {
        "id": "verif-101",
        "applicant_name": "Kavindu Perera",
        "document_type": "National Identity Card (NIC)",
        "submission_date": "2026-07-30T11:20:00Z",
        "status": "pending",
        "ocr_confidence": 0.94,
        "extracted_fields": {
            "full_name": "Kavindu Perera",
            "nic_number": "199420401829",
            "date_of_birth": "1994-07-22",
            "address": "No. 45, Galle Road, Colombo 03",
        },
        "notes": "",
    },
    {
        "id": "verif-102",
        "applicant_name": "Nimmi De Silva",
        "document_type": "Income Eligibility Certificate",
        "submission_date": "2026-07-31T09:15:00Z",
        "status": "pending",
        "ocr_confidence": 0.88,
        "extracted_fields": {
            "full_name": "Nimmi De Silva",
            "monthly_income_lkr": "45000",
            "issuing_grama_niladhari_division": "Kandy North",
            "certificate_date": "2026-06-15",
        },
        "notes": "",
    },
]


class VerificationUpdateRequest(BaseModel):
    status: Literal["approved", "rejected", "flagged"]
    notes: str = Field(default="")


@router.get("/documents")
async def list_verification_documents(
    status_filter: str | None = None,
    _: Annotated[str, Depends(require_admin_user)] = None,
) -> list[dict]:
    """List legal aid applicant verification documents."""
    if status_filter:
        return [d for d in _IN_MEMORY_VERIFICATION_QUEUE if d["status"] == status_filter]
    return _IN_MEMORY_VERIFICATION_QUEUE


@router.get("/documents/{doc_id}")
async def get_verification_document(
    doc_id: str,
    _: Annotated[str, Depends(require_admin_user)],
) -> dict:
    """Get single document verification details and extracted OCR fields."""
    doc = next((d for d in _IN_MEMORY_VERIFICATION_QUEUE if d["id"] == doc_id), None)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Verification document not found."
        )
    return doc


@router.post("/documents/{doc_id}/verify")
async def update_verification_status(
    doc_id: str,
    payload: VerificationUpdateRequest,
    admin_user: Annotated[str, Depends(require_admin_user)],
) -> dict:
    """Approve, reject, or flag a document verification submission."""
    doc = next((d for d in _IN_MEMORY_VERIFICATION_QUEUE if d["id"] == doc_id), None)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Verification document not found."
        )

    doc["status"] = payload.status
    doc["notes"] = payload.notes
    doc["verified_by"] = admin_user
    doc["verified_at"] = datetime.now(timezone.utc).isoformat()

    return {
        "status": "success",
        "doc_id": doc_id,
        "verification_status": doc["status"],
        "verified_by": admin_user,
    }
