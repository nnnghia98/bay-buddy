"""make_ticket_airline_nullable

Revision ID: e2f4a6c8b9d0
Revises:     5a7d9c2e4f61
Created at:  2026-06-17 00:00:00.000000+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "e2f4a6c8b9d0"
down_revision: str | None = "5a7d9c2e4f61"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


airline_enum = sa.Enum("VNA", "VJ", "QH", "VU", name="airline")


def upgrade() -> None:
    op.alter_column(
        "ticket",
        "airline",
        existing_type=airline_enum,
        nullable=True,
    )


def downgrade() -> None:
    op.execute("UPDATE ticket SET airline = 'VNA' WHERE airline IS NULL")
    op.alter_column(
        "ticket",
        "airline",
        existing_type=airline_enum,
        nullable=False,
    )
