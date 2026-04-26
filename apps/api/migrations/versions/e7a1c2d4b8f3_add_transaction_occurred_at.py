"""add_transaction_occurred_at

Revision ID: e7a1c2d4b8f3
Revises:     c0b9c7c2e8ab
Created at:  2026-04-26 10:00:00.000000+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "e7a1c2d4b8f3"
down_revision: str | None = "c0b9c7c2e8ab"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "transaction",
        sa.Column("occurred_at", sa.DateTime(), nullable=True),
    )

    op.execute(
        sa.text(
            """
            UPDATE "transaction"
            SET occurred_at = created_at
            WHERE occurred_at IS NULL
            """
        )
    )

    op.alter_column(
        "transaction",
        "occurred_at",
        existing_type=sa.DateTime(),
        nullable=False,
    )


def downgrade() -> None:
    op.drop_column("transaction", "occurred_at")
