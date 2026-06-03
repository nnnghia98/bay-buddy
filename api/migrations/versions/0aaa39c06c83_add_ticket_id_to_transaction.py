"""add_ticket_id_to_transaction

Revision ID: 0aaa39c06c83
Revises:     7738bf9c9793
Created at:  2026-04-04 06:33:37.979994+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "0aaa39c06c83"
down_revision: str | None = "7738bf9c9793"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

fk_name = "fk_transaction_ticket_id_ticket"


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("transaction") as batch_op:
            batch_op.add_column(sa.Column("ticket_id", sa.Uuid(), nullable=True))
            batch_op.create_index("ix_transaction_ticket_id", ["ticket_id"], unique=False)
            batch_op.create_foreign_key(
                fk_name,
                "ticket",
                ["ticket_id"],
                ["id"],
            )
        return

    op.add_column("transaction", sa.Column("ticket_id", sa.Uuid(), nullable=True))
    op.create_index(
        op.f("ix_transaction_ticket_id"),
        "transaction",
        ["ticket_id"],
        unique=False,
    )
    op.create_foreign_key(
        fk_name,
        "transaction",
        "ticket",
        ["ticket_id"],
        ["id"],
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("transaction") as batch_op:
            batch_op.drop_constraint(fk_name, type_="foreignkey")
            batch_op.drop_index("ix_transaction_ticket_id")
            batch_op.drop_column("ticket_id")
        return

    op.drop_constraint(fk_name, "transaction", type_="foreignkey")
    op.drop_index(op.f("ix_transaction_ticket_id"), table_name="transaction")
    op.drop_column("transaction", "ticket_id")
