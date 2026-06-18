"""add_ticket_insurance_price

Revision ID: 8c9d0e1f2345
Revises:     f3a5b7d9c1e2
Created at:  2026-06-18 00:00:00.000000+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "8c9d0e1f2345"
down_revision: str | None = "f3a5b7d9c1e2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    existing_columns = {
        column["name"] for column in sa.inspect(bind).get_columns("ticket")
    }

    if "insurance_price" not in existing_columns:
        op.add_column(
            "ticket",
            sa.Column("insurance_price", sa.Float(), nullable=False, server_default="0"),
        )

    op.execute(
        sa.text(
            """
            UPDATE ticket
            SET insurance_price = COALESCE(insurance_price, 0),
                true_income = selling_price + COALESCE(discount, 0)
                    - (
                        COALESCE(ev_price, 0)
                        + COALESCE(ast_price, 0)
                        + COALESCE(thf_price, 0)
                        + COALESCE(web_price, 0)
                        + COALESCE(insurance_price, 0)
                    )
            """
        )
    )

    if bind.dialect.name != "sqlite":
        op.alter_column("ticket", "insurance_price", server_default=None)


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
                    + COALESCE(web_price, 0)
                )
            """
        )
    )

    if "insurance_price" in existing_columns:
        op.drop_column("ticket", "insurance_price")
