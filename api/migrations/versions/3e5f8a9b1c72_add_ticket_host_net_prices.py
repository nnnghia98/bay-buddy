"""add_ticket_host_net_prices

Revision ID: 3e5f8a9b1c72
Revises:     2f4c6e8a9b10
Created at:  2026-06-16 00:00:00.000000+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "3e5f8a9b1c72"
down_revision: str | None = "2f4c6e8a9b10"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    existing_columns = {
        column["name"] for column in sa.inspect(bind).get_columns("ticket")
    }

    if "ev_price" not in existing_columns:
        op.add_column(
            "ticket",
            sa.Column("ev_price", sa.Float(), nullable=False, server_default="0"),
        )
    if "ast_price" not in existing_columns:
        op.add_column(
            "ticket",
            sa.Column("ast_price", sa.Float(), nullable=False, server_default="0"),
        )

    op.execute(
        sa.text(
            """
            UPDATE ticket
            SET ev_price = COALESCE(net_price, 0),
                ast_price = 0,
                true_income = selling_price + COALESCE(discount, 0) - COALESCE(net_price, 0)
            """
        )
    )

    if bind.dialect.name != "sqlite":
        op.alter_column("ticket", "ev_price", server_default=None)
        op.alter_column("ticket", "ast_price", server_default=None)


def downgrade() -> None:
    bind = op.get_bind()
    existing_columns = {
        column["name"] for column in sa.inspect(bind).get_columns("ticket")
    }

    op.execute(
        sa.text(
            """
            UPDATE ticket
            SET true_income = selling_price + COALESCE(discount, 0) - COALESCE(net_price, 0)
            """
        )
    )
    if "ast_price" in existing_columns:
        op.drop_column("ticket", "ast_price")
    if "ev_price" in existing_columns:
        op.drop_column("ticket", "ev_price")
