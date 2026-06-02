"""Resolve a WhatsApp phone number to a platform user.

Port of the Go core-service identity matcher: look the number up via its linked
account and, on first contact, provision a user plus account atomically. Web
login and the WhatsApp worker share this one code path so a user who only ever
messages over WhatsApp still gets a durable id and role.
"""

from __future__ import annotations

from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.auth import Account, User

WHATSAPP_PROVIDER = "whatsapp"


def match_or_register(db: Session, phone: str) -> User:
    """Return the user linked to ``phone``, provisioning one on first contact.

    Either both inserts (user + account) land or neither does.
    """
    phone = phone.strip()
    if not phone:
        raise ValueError("identity: empty phone number")

    account = db.execute(
        select(Account).where(
            Account.provider == WHATSAPP_PROVIDER,
            Account.provider_account_id == phone,
        )
    ).scalar_one_or_none()
    if account is not None:
        return account.user

    return _register(db, phone)


def _register(db: Session, phone: str) -> User:
    user = User(
        id="usr_" + uuid4().hex,
        name=f"WhatsApp User ({phone})",
        phone=phone,
        role="USER",
    )
    user.accounts.append(
        Account(provider=WHATSAPP_PROVIDER, provider_account_id=phone)
    )
    db.add(user)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(user)
    return user
