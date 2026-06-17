"""make_ticket_itinerary_nullable

Revision ID: f3a5b7d9c1e2
Revises:     e2f4a6c8b9d0
Created at:  2026-06-17 00:00:00.000000+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "f3a5b7d9c1e2"
down_revision: str | None = "e2f4a6c8b9d0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "ticket",
        "itinerary",
        existing_type=sa.String(length=100),
        nullable=True,
    )


def downgrade() -> None:
    op.execute("UPDATE ticket SET itinerary = 'UNKNOWN' WHERE itinerary IS NULL")
    op.alter_column(
        "ticket",
        "itinerary",
        existing_type=sa.String(length=100),
        nullable=False,
    )
