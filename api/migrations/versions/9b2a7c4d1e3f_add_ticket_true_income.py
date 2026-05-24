"""add_ticket_true_income

Revision ID: 9b2a7c4d1e3f
Revises:     1f8c6b2d9e10
Created at:  2026-05-24 00:00:00.000000+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "9b2a7c4d1e3f"
down_revision: str | None = "1f8c6b2d9e10"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("ticket", sa.Column("true_income", sa.Float(), nullable=True))
    op.execute(
        sa.text(
            """
            UPDATE ticket
            SET true_income = selling_price + COALESCE(discount, 0) - net_price
            """
        )
    )
    op.alter_column("ticket", "true_income", existing_type=sa.Float(), nullable=False)


def downgrade() -> None:
    op.drop_column("ticket", "true_income")
