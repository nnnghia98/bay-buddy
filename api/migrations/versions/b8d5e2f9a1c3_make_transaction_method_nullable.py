"""make transaction method nullable for unpaid ticket debt

Revision ID: b8d5e2f9a1c3
Revises: a6c4e8f2b7d1
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "b8d5e2f9a1c3"
down_revision: str | None = "a6c4e8f2b7d1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _set_method_nullable(nullable: bool) -> None:
    bind = op.get_bind()
    existing_type = sa.String(length=100)

    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("transaction") as batch_op:
            batch_op.alter_column(
                "method",
                existing_type=existing_type,
                existing_nullable=not nullable,
                nullable=nullable,
            )
        return

    op.alter_column(
        "transaction",
        "method",
        existing_type=existing_type,
        existing_nullable=not nullable,
        nullable=nullable,
    )


def upgrade() -> None:
    _set_method_nullable(True)

    op.execute(
        sa.text(
            """
            UPDATE "transaction"
            SET method = NULL
            WHERE category = 'TICKET_PURCHASE'
              AND method = 'Ticket'
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE "transaction"
            SET method = 'Ticket'
            WHERE method IS NULL
            """
        )
    )

    _set_method_nullable(False)
