"""add_ticket_discount_fare_class_seat_code

Revision ID: 6c8d4e9a1b2f
Revises:     f19c2a6b7d41
Created at:  2026-04-30 09:45:00.000000+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "6c8d4e9a1b2f"
down_revision: str | None = "f19c2a6b7d41"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "ticket",
        sa.Column("seat_code", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "ticket",
        sa.Column("fare_class", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "ticket",
        sa.Column("discount", sa.Float(), nullable=False, server_default="0"),
    )
    op.alter_column("ticket", "discount", server_default=None)


def downgrade() -> None:
    op.drop_column("ticket", "discount")
    op.drop_column("ticket", "fare_class")
    op.drop_column("ticket", "seat_code")
