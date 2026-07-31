import json
import re
from dataclasses import dataclass, field
from typing import Any

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.logging import get_logger
from app.models.customer_profile import CustomerProfile

logger = get_logger(__name__)

_CACHE_TTL_SECONDS = 3600
_CACHE_KEY_PREFIX = "customer_profile:"


@dataclass
class CustomerProfileData:
    name: str | None = None
    phone: str | None = None
    addresses: list[dict[str, Any]] = field(default_factory=list)

    def missing_fields(self) -> list[str]:
        missing = []
        if not self.name:
            missing.append("name")
        if not self.phone:
            missing.append("phone")
        if not self.addresses:
            missing.append("addresses")
        return missing

    def to_prompt_text(self) -> str:
        lines: list[str] = []
        if self.name:
            lines.append(f"Name: {self.name}")
        if self.phone:
            lines.append(f"Phone: {self.phone}")
        if self.addresses:
            lines.append("Addresses:")
            for addr in self.addresses:
                label = addr.get("label", "default")
                value = addr.get("value", "")
                if value:
                    lines.append(f"  - {label}: {value}")
        return "\n".join(lines)


class CustomerProfileRepository:
    """Read and write the relational customer profile.

    Redis is the read cache (TTL 1 h). Postgres is the source of truth.

    ``get`` / ``save`` are used by the web UI for full reads and writes.
    ``upsert_profile`` is used by the LLM extractor — it fills empty fields and
    applies the corrections the customer makes to their own profile.
    """

    def __init__(self, sessionmaker: async_sessionmaker[AsyncSession], redis: Redis) -> None:
        self._sessionmaker = sessionmaker
        self._redis = redis

    async def get(self, identity: str) -> CustomerProfileData | None:
        cache_key = f"{_CACHE_KEY_PREFIX}{identity}"
        cached = await self._redis.get(cache_key)
        if cached is not None:
            try:
                raw = json.loads(cached)
                return CustomerProfileData(
                    name=raw.get("name"),
                    phone=raw.get("phone"),
                    addresses=raw.get("addresses", []),
                )
            except (ValueError, TypeError):
                pass

        async with self._sessionmaker() as session:
            row = await session.scalar(
                select(CustomerProfile).where(CustomerProfile.user_identity == identity)
            )

        if row is None:
            return None

        data = CustomerProfileData(name=row.name, phone=row.phone, addresses=row.addresses or [])
        await self._set_cache(identity, data)
        return data

    async def save(self, identity: str, data: CustomerProfileData) -> None:
        async with self._sessionmaker() as session:
            row = await session.get(CustomerProfile, identity)
            if row is None:
                session.add(
                    CustomerProfile(
                        user_identity=identity,
                        name=data.name,
                        phone=data.phone,
                        addresses=data.addresses,
                    )
                )
            else:
                row.name = data.name
                row.phone = data.phone
                row.addresses = data.addresses
            await session.commit()
        await self._set_cache(identity, data)

    async def upsert_profile(self, identity: str, data: CustomerProfileData) -> bool:
        """Fill empty fields and apply corrections the customer makes to their own
        profile. ``data`` is what the extractor resolved from the latest exchange
        against the current profile, so a non-empty value that differs from what is
        stored is treated as the customer's intended update and overwrites it."""
        async with self._sessionmaker() as session:
            row = await session.get(CustomerProfile, identity)
            changed = False
            if row is None:
                row = CustomerProfile(user_identity=identity, addresses=[])
                session.add(row)
                changed = True
            if data.name and data.name != row.name:
                row.name = data.name
                changed = True
            if data.phone and data.phone != row.phone:
                row.phone = data.phone
                changed = True

            if data.addresses:
                existing_addresses = list(row.addresses or [])
                for new_addr in data.addresses:
                    new_val = new_addr.get("value", "").strip()
                    if not new_val:
                        continue

                    # Check if this new address is a slight change of an existing one
                    matched_idx = -1
                    for idx, ext_addr in enumerate(existing_addresses):
                        ext_val = ext_addr.get("value", "").strip()
                        if _is_similar_address(new_val, ext_val):
                            matched_idx = idx
                            break

                    if matched_idx >= 0:
                        old_val = existing_addresses[matched_idx].get("value", "")
                        if old_val != new_val:
                            existing_addresses[matched_idx]["value"] = new_val
                            changed = True
                    else:
                        label = new_addr.get("label") or "default"
                        if any(a.get("label") == label for a in existing_addresses):
                            label = f"address_{len(existing_addresses) + 1}"
                        existing_addresses.append(
                            {"label": label, "value": new_val, "is_default": not existing_addresses}
                        )
                        changed = True

                if changed:
                    row.addresses = existing_addresses

            if changed:
                await session.commit()

        if changed:
            updated = CustomerProfileData(
                name=row.name,
                phone=row.phone,
                addresses=row.addresses or [],
            )
            await self._set_cache(identity, updated)
        return changed

    async def _set_cache(self, identity: str, data: CustomerProfileData) -> None:
        payload = json.dumps(
            {
                "name": data.name,
                "phone": data.phone,
                "addresses": data.addresses,
            }
        )
        await self._redis.setex(f"{_CACHE_KEY_PREFIX}{identity}", _CACHE_TTL_SECONDS, payload)


def _is_similar_address(addr1: str, addr2: str) -> bool:
    """True if two addresses are highly similar, suggesting a typo or minor update."""
    words1 = set(re.findall(r"\w+", addr1.lower()))
    words2 = set(re.findall(r"\w+", addr2.lower()))
    if not words1 or not words2:
        return False
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    similarity = len(intersection) / len(union)
    overlap = len(intersection) / min(len(words1), len(words2))
    return similarity >= 0.6 or overlap >= 0.8
