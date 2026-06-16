"""add_ticket_booked_at

Revision ID: 5a7d9c2e4f61
Revises:     7c8d9e0f1234
Created at:  2026-06-16 00:00:00.000000+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "5a7d9c2e4f61"
down_revision: str | None = "7c8d9e0f1234"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("ticket", sa.Column("booked_at", sa.DateTime(), nullable=True))
    op.create_index("ix_ticket_booked_at", "ticket", ["booked_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_ticket_booked_at", table_name="ticket")
    op.drop_column("ticket", "booked_at")
