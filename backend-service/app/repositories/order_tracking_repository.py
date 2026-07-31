from datetime import UTC, datetime
from typing import Any

from sqlalchemy import desc, select

from app.models.order_tracking import OrderTracking


class OrderTrackingRepository:
    """Read and write per-customer Kakille order tracking records."""

    def __init__(self, sessionmaker: Any) -> None:
        self._sessionmaker = sessionmaker

    async def get_all_for_user(self, identity: str) -> list[OrderTracking]:
        """Fetch all tracking records for this customer."""
        async with self._sessionmaker() as session:
            stmt = (
                select(OrderTracking)
                .where(OrderTracking.user_identity == identity)
                .order_by(desc(OrderTracking.created_at))
            )
            res = await session.scalars(stmt)
            return list(res.all())

    async def record_tracking(
        self, identity: str, tracking_number: str, status: str = "tracking"
    ) -> bool:
        """Insert a new tracking number or update its status, only writing when
        something actually changed. Returns True if a change was persisted."""
        async with self._sessionmaker() as session:
            stmt = select(OrderTracking).where(OrderTracking.tracking_number == tracking_number)
            row = await session.scalar(stmt)
            if row is None:
                now = datetime.now(UTC)
                session.add(
                    OrderTracking(
                        user_identity=identity,
                        tracking_number=tracking_number,
                        status=status,
                        created_at=now,
                        updated_at=now,
                    )
                )
            elif row.status != status:
                row.status = status
                row.updated_at = datetime.now(UTC)
            else:
                return False
            await session.commit()
            return True
