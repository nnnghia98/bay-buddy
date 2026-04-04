"""
migrations/env.py – Alembic environment configuration for Bay Buddy.

Supports both offline (SQL script generation) and online (live DB) modes.

Key design decisions
--------------------
- DATABASE_URL is read from the environment / .env file at runtime,
  overriding whatever is set in alembic.ini. This keeps credentials
  out of source control.
- `import models` registers all SQLModel table classes with
  SQLModel.metadata *before* `target_metadata` is referenced, which
  is the critical step that enables autogenerate to detect schema diffs.
"""

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool

# ---------------------------------------------------------------------------
# Make sure `apps/api/` is on sys.path so we can import `models` and
# `database` as top-level packages regardless of the working directory.
# ---------------------------------------------------------------------------
API_DIR = Path(__file__).resolve().parent.parent  # apps/api/
sys.path.insert(0, str(API_DIR))

# Load .env before reading DATABASE_URL.
load_dotenv(API_DIR / ".env")

# ---------------------------------------------------------------------------
# CRITICAL: Import all model modules so every SQLModel table class is
# registered with SQLModel.metadata before autogenerate scans the schema.
#
# `models/__init__.py` re-exports every table (User, Customer, Ticket,
# Transaction) in FK-dependency order, so a single import here is enough.
# The `metadata` name is the same object as SQLModel.metadata.
# ---------------------------------------------------------------------------
from models import metadata  # noqa: E402 – registers all tables as a side-effect

# ---------------------------------------------------------------------------
# Alembic Config object – gives access to values in alembic.ini.
# ---------------------------------------------------------------------------
config = context.config

# Override sqlalchemy.url with the runtime environment variable.
_db_url: str = os.getenv("DATABASE_URL", "sqlite:///./bay_buddy.db")
config.set_main_option("sqlalchemy.url", _db_url)

# Set up Python logging from config file.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# The metadata object Alembic will compare against the live DB.
# `metadata` was imported from models above; it IS SQLModel.metadata.
target_metadata = metadata


# ---------------------------------------------------------------------------
# Offline mode – generate a SQL script without a live connection.
# Run with: alembic upgrade head --sql
# ---------------------------------------------------------------------------

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # Compare server defaults so generated SQL is fully accurate.
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# ---------------------------------------------------------------------------
# Online mode – run migrations against a live database connection.
# Run with: alembic upgrade head
# ---------------------------------------------------------------------------

def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
