"""
database.py – SQLModel engine and session management.

Environment variables:
  DATABASE_URL  Full SQLAlchemy connection URL.
                Default (dev): sqlite:///./bay_buddy.db
                Production:    postgresql+psycopg2://user:pass@host/dbname

Usage in routes:
    from database import SessionDep

    @router.get("/example")
    async def example(session: SessionDep) -> ...:
        ...
"""

import os
from collections.abc import Generator

from dotenv import load_dotenv
from sqlmodel import Session, SQLModel, create_engine

load_dotenv()

# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./bay_buddy.db")

# connect_args is only needed for SQLite (thread-safety for sync sessions).
_connect_args: dict = (
    {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

engine = create_engine(
    DATABASE_URL,
    connect_args=_connect_args,
    echo=os.getenv("SQL_ECHO", "false").lower() == "true",
)


# ---------------------------------------------------------------------------
# Table creation helper (used by Alembic env.py for the initial setup check)
# ---------------------------------------------------------------------------

def create_db_and_tables() -> None:
    """
    Create all tables that are registered with SQLModel.metadata.

    NOTE: In production, prefer Alembic migrations (`alembic upgrade head`)
    over calling this function directly.
    """
    SQLModel.metadata.create_all(engine)


# ---------------------------------------------------------------------------
# Session dependency (FastAPI DI)
# ---------------------------------------------------------------------------

def get_session() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a SQLModel Session per request.

    Automatically committed on success or rolled back on exception.

    Usage:
        from typing import Annotated
        from fastapi import Depends
        from database import get_session
        from sqlmodel import Session

        SessionDep = Annotated[Session, Depends(get_session)]
    """
    with Session(engine) as session:
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise


# ---------------------------------------------------------------------------
# Convenience type alias – import this in route files
# ---------------------------------------------------------------------------

from typing import Annotated  # noqa: E402 (must be after engine definition)
from fastapi import Depends  # noqa: E402

SessionDep = Annotated[Session, Depends(get_session)]
