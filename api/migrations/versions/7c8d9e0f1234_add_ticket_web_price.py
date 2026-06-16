"""add_ticket_web_price

Revision ID: 7c8d9e0f1234
Revises:     6b7c8d9e0f12
Created at:  2026-06-16 00:00:00.000000+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "7c8d9e0f1234"
down_revision: str | None = "6b7c8d9e0f12"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    existing_columns = {
        column["name"] for column in sa.inspect(bind).get_columns("ticket")
    }

    if "web_price" not in existing_columns:
        op.add_column(
            "ticket",
            sa.Column("web_price", sa.Float(), nullable=False, server_default="0"),
        )

    op.execute(
        sa.text(
            """
            UPDATE ticket
            SET web_price = COALESCE(web_price, 0),
                true_income = selling_price + COALESCE(discount, 0)
                    - (
                        COALESCE(ev_price, 0)
                        + COALESCE(ast_price, 0)
                        + COALESCE(thf_price, 0)
                        + COALESCE(web_price, 0)
                    )
            """
        )
    )

    if bind.dialect.name != "sqlite":
        op.alter_column("ticket", "web_price", server_default=None)


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
                - (
                    COALESCE(ev_price, 0)
                    + COALESCE(ast_price, 0)
                    + COALESCE(thf_price, 0)
                )
            """
        )
    )

    if "web_price" in existing_columns:
        op.drop_column("ticket", "web_price")
