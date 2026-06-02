"""One-time codes for passwordless WhatsApp login.

Port of the Go core-service OTP service: generate a 6-digit code, replace any
outstanding codes for the phone, persist it with a short expiry, and dispatch it
over the message transport. Verification consumes the code single-use.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func
from sqlalchemy.orm import Session

from app.messaging.publisher import MessagePublisher
from app.models.auth import VerificationToken

CODE_TTL = timedelta(minutes=5)
OTP_MESSAGE = "Your LegalAid verification code is {code}. It expires in 5 minutes."


def _generate_code() -> str:
    """A uniformly random, zero-padded 6-digit code from a secure source."""
    return f"{secrets.randbelow(1_000_000):06d}"


async def send(db: Session, publisher: MessagePublisher, phone: str) -> None:
    """Issue a fresh code for ``phone`` and dispatch it.

    One live code per phone: prior codes are cleared before the new one is
    stored. The code is persisted before dispatch so a transport failure does
    not leave the user unable to verify a code they may already have received.
    """
    code = _generate_code()

    db.execute(delete(VerificationToken).where(VerificationToken.identifier == phone))
    db.add(
        VerificationToken(
            identifier=phone,
            token=code,
            expires=datetime.now(timezone.utc) + CODE_TTL,
        )
    )
    db.commit()

    # Do not leak the code in the response; it is delivered over WhatsApp.
    await publisher.publish_text(phone, OTP_MESSAGE.format(code=code))


def verify(db: Session, phone: str, code: str) -> bool:
    """Consume a code, returning False when it is wrong or expired.

    The matching row is deleted single-use, so a replayed code cannot succeed
    twice; any other live codes for the phone are cleared on success.
    """
    result = db.execute(
        delete(VerificationToken).where(
            VerificationToken.identifier == phone,
            VerificationToken.token == code,
            VerificationToken.expires > func.now(),
        )
    )
    if result.rowcount == 0:
        db.rollback()
        return False

    db.execute(delete(VerificationToken).where(VerificationToken.identifier == phone))
    db.commit()
    return True
