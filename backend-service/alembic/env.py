import asyncio
from logging.config import fileConfig
from typing import Any

from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlalchemy.pool import NullPool

from alembic import context
from app.core.config import get_settings
from app.db.base import Base
from app.models import (  # noqa: F401 -- register model metadata for autogenerate
    ConversationIndex,
    CustomerCartCheckout,
    CustomerMemory,
    CustomerProfile,
    Note,
    OrderTracking,
    Reminder,
    Source,
    User,
)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Escape '%' characters to prevent ConfigParser from treating them as interpolation markers
config.set_main_option("sqlalchemy.url", get_settings().database.url.replace("%", "%%"))

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def _do_run_migrations(connection: Any) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(_do_run_migrations)
    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
