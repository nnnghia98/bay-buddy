"""add ticket charge payment date metadata

Revision ID: c4f7a9d2e6b1
Revises: b8d5e2f9a1c3
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "c4f7a9d2e6b1"
down_revision: str | None = "b8d5e2f9a1c3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "transaction",
        sa.Column("payment_occurred_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("transaction", "payment_occurred_at")
