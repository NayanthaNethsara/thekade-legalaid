import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import Principal, get_principal, get_reminder_repository
from app.repositories.reminder_repository import ReminderRepository
from app.schemas.reminder import (
    ReminderCreateRequest,
    ReminderResponse,
    ReminderUpdateRequest,
)

router = APIRouter(prefix="/reminders", tags=["reminders"])

_CONVERSATION_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,64}$")

ReminderRepoDep = Annotated[ReminderRepository, Depends(get_reminder_repository)]
PrincipalDep = Annotated[Principal, Depends(get_principal)]


@router.get("", response_model=list[ReminderResponse])
async def list_reminders(
    principal: PrincipalDep,
    repo: ReminderRepoDep,
    conversation_id: str,
) -> list[ReminderResponse]:
    if not _CONVERSATION_ID_PATTERN.match(conversation_id):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid conversation id.",
        )
    return await repo.list_for_conversation(principal.kind, principal.id, conversation_id)


@router.post("", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
async def create_reminder(
    payload: ReminderCreateRequest,
    principal: PrincipalDep,
    repo: ReminderRepoDep,
) -> ReminderResponse:
    return await repo.create(
        principal.kind,
        principal.id,
        payload.conversation_id,
        payload.title,
        payload.due_date,
    )


@router.patch("/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(
    reminder_id: str,
    payload: ReminderUpdateRequest,
    principal: PrincipalDep,
    repo: ReminderRepoDep,
) -> ReminderResponse:
    provided = payload.model_fields_set
    updated = await repo.update(
        reminder_id,
        principal.kind,
        principal.id,
        title=payload.title,
        due_date=payload.due_date,
        clear_due_date="due_date" in provided and payload.due_date is None,
        is_done=payload.is_done,
    )
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")
    return updated


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reminder(
    reminder_id: str,
    principal: PrincipalDep,
    repo: ReminderRepoDep,
) -> None:
    deleted = await repo.delete(reminder_id, principal.kind, principal.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")
