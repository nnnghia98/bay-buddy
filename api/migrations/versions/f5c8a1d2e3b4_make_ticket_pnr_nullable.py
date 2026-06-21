"""make_ticket_pnr_nullable

Revision ID: f5c8a1d2e3b4
Revises:     8c9d0e1f2345
Created at:  2026-06-21 00:00:00.000000+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "f5c8a1d2e3b4"
down_revision: str | None = "8c9d0e1f2345"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "ticket",
        "pnr",
        existing_type=sa.String(length=6),
        nullable=True,
    )
    op.execute("UPDATE ticket SET pnr = NULL WHERE pnr = 'MANUAL'")


def downgrade() -> None:
    op.execute("UPDATE ticket SET pnr = 'MANUAL' WHERE pnr IS NULL")
    op.alter_column(
        "ticket",
        "pnr",
        existing_type=sa.String(length=6),
        nullable=False,
    )
