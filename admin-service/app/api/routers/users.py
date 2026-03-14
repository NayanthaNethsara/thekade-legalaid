from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.repositories.user import UserRepository

router = APIRouter(prefix="/users", tags=["users"])


class UserStatusUpdate(BaseModel):
    status: Literal["guest", "citizen", "lawyer"]


@router.get("")
def list_users(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List all users with their current status."""
    repo = UserRepository(db)
    users = repo.get_paginated(limit=limit, offset=offset)
    total = repo.count_users()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [
            {
                "id": u.id,
                "phone_number": u.phone_number,
                "status": u.status,
                "created_at": u.created_at,
                "updated_at": u.updated_at,
            }
            for u in users
        ]
    }


@router.put("/{user_id}/status")
def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
):
    """Update a user's status (guest, citizen, lawyer)."""
    repo = UserRepository(db)
    user = repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    updated_user = repo.update_status(user, payload.status)
    return {
        "id": updated_user.id,
        "phone_number": updated_user.phone_number,
        "status": updated_user.status,
    }
