"""add_customer_is_active

Revision ID: a5f0d9e1c234
Revises:     f19c2a6b7d41
Created at:  2026-05-03 13:00:00.000000+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "a5f0d9e1c234"
down_revision: str | None = "f19c2a6b7d41"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "customer",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.alter_column("customer", "is_active", server_default=None)


def downgrade() -> None:
    op.drop_column("customer", "is_active")
