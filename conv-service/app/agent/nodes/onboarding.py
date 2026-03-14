"""Onboarding node — registers new users and gates pipeline access.

This node runs early in the pipeline (after ``load_memory``) and:
  1. Looks up the user by phone (Redis cache → DB fallback).
  2. If no user exists, creates one with ``status='guest'``.
  3. If the user's status is not ``citizen`` or ``lawyer``, sets
     ``is_authorized=False`` so routing skips to ``response_generator``
     which returns the static onboarding message.
"""

from app.agent.state import AgentState
from app.core.db import SessionLocal
from app.core.redis import RedisClient
from app.repositories.redis.user import UserRedisRepository
from app.repositories.user import UserRepository
from app.services.user import UserService
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

# Statuses allowed to proceed through the full agent pipeline.
AUTHORIZED_STATUSES = {"citizen", "lawyer"}

ONBOARDING_MESSAGE = (
    "👋 Welcome to LegalAid! This is currently a test AI agent. "
    "Please contact the developers for early access.\n\n"
    "Once you are approved, you'll be able to ask legal questions, "
    "schedule meetings, and more."
)


async def onboarding_node(state: AgentState) -> dict:
    """Register or look up the user and check authorisation status."""

    phone: str = state["user_phone"]

    try:
        redis_client = RedisClient.get_instance()

        with SessionLocal() as db:
            user_repo = UserRepository(db)
            user_redis_repo = UserRedisRepository(redis_client)
            user_service = UserService(user_repo, user_redis_repo)

            user = await user_service.get_user_by_phone(phone)

            if not user:
                user = await user_service.create_user(phone)
                logger.info(
                    f"[{phone}] onboarding: new user registered (id={user.id}, status=guest)"
                )
            else:
                logger.info(
                    f"[{phone}] onboarding: existing user (id={user.id}, status={user.status})"
                )

            user_id = str(user.id)
            user_status = getattr(user, "status", "guest") or "guest"

    except Exception as exc:
        logger.error(f"[{phone}] onboarding error: {exc}")
        # On error, block access to be safe.
        return {
            "user_id": None,
            "user_status": "guest",
            "is_authorized": False,
        }

    is_authorized = user_status in AUTHORIZED_STATUSES

    if not is_authorized:
        logger.info(
            f"[{phone}] onboarding: status='{user_status}' — NOT authorized"
        )

    return {
        "user_id": user_id,
        "user_status": user_status,
        "is_authorized": is_authorized,
    }
