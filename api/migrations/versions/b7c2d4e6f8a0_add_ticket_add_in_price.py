"""add_ticket_add_in_price

Revision ID: b7c2d4e6f8a0
Revises: c4f7a9d2e6b1
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "b7c2d4e6f8a0"
down_revision: str | None = "c4f7a9d2e6b1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    existing_columns = {
        column["name"] for column in sa.inspect(bind).get_columns("ticket")
    }

    if "add_in_price" not in existing_columns:
        op.add_column(
            "ticket",
            sa.Column(
                "add_in_price",
                sa.Float(),
                nullable=False,
                server_default="0",
            ),
        )

    if bind.dialect.name != "sqlite":
        op.alter_column("ticket", "add_in_price", server_default=None)


def downgrade() -> None:
    bind = op.get_bind()
    existing_columns = {
        column["name"] for column in sa.inspect(bind).get_columns("ticket")
    }

    if "add_in_price" in existing_columns:
        op.drop_column("ticket", "add_in_price")
