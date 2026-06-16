"""add_ticket_thf_price

Revision ID: 6b7c8d9e0f12
Revises:     3e5f8a9b1c72
Created at:  2026-06-16 00:00:00.000000+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "6b7c8d9e0f12"
down_revision: str | None = "3e5f8a9b1c72"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    existing_columns = {
        column["name"] for column in sa.inspect(bind).get_columns("ticket")
    }

    if "thf_price" not in existing_columns:
        op.add_column(
            "ticket",
            sa.Column("thf_price", sa.Float(), nullable=False, server_default="0"),
        )

    op.execute(
        sa.text(
            """
            UPDATE ticket
            SET thf_price = COALESCE(thf_price, 0),
                true_income = selling_price + COALESCE(discount, 0)
                    - (COALESCE(ev_price, 0) + COALESCE(ast_price, 0) + COALESCE(thf_price, 0))
            """
        )
    )

    if bind.dialect.name != "sqlite":
        op.alter_column("ticket", "thf_price", server_default=None)


def downgrade() -> None:
    bind = op.get_bind()
    existing_columns = {
        column["name"] for column in sa.inspect(bind).get_columns("ticket")
    }

    op.execute(
        sa.text(
            """
            UPDATE ticket
            SET true_income = selling_price + COALESCE(discount, 0)
                - (COALESCE(ev_price, 0) + COALESCE(ast_price, 0))
            """
        )
    )

    if "thf_price" in existing_columns:
        op.drop_column("ticket", "thf_price")
