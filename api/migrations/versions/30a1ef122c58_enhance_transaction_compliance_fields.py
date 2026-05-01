"""enhance_transaction_compliance_fields

Revision ID: 30a1ef122c58
Revises:     0aaa39c06c83
Created at:  2026-04-05 11:20:00.000000+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "30a1ef122c58"
down_revision: str | None = "0aaa39c06c83"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


transaction_category_enum = sa.Enum(
    "TICKET_PURCHASE",
    "PAYMENT",
    "DISCOUNT",
    "ADDITIONAL_FEE",
    "REFUND",
    name="transactioncategory",
)


def upgrade() -> None:
    bind = op.get_bind()
    is_postgresql = bind.dialect.name == "postgresql"

    if is_postgresql:
        op.execute(sa.text('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'))

    def get_transaction_columns() -> set[str]:
        inspector = sa.inspect(bind)
        return {
            column["name"] for column in inspector.get_columns("transaction")
        }

    transaction_columns = get_transaction_columns()

    if is_postgresql:
        for table_name in ("user", "customer", "ticket", "transaction"):
            op.alter_column(
                table_name,
                "id",
                existing_type=sa.Uuid(),
                server_default=sa.text("gen_random_uuid()"),
            )

    transaction_category_enum.create(bind, checkfirst=True)

    if "category" not in transaction_columns:
        op.add_column(
            "transaction",
            sa.Column(
                "category",
                transaction_category_enum,
                nullable=True,
                server_default="TICKET_PURCHASE",
            ),
        )

    if "evidence_url" not in transaction_columns:
        op.add_column(
            "transaction",
            sa.Column("evidence_url", sa.String(length=2048), nullable=True),
        )

    if "linked_ticket_id" not in transaction_columns:
        op.add_column(
            "transaction",
            sa.Column("linked_ticket_id", sa.Uuid(), nullable=True),
        )
        op.create_index(
            op.f("ix_transaction_linked_ticket_id"),
            "transaction",
            ["linked_ticket_id"],
            unique=False,
        )
        op.create_foreign_key(
            "fk_transaction_linked_ticket_id_ticket",
            "transaction",
            "ticket",
            ["linked_ticket_id"],
            ["id"],
        )

    if "is_refund_confirmed" not in transaction_columns:
        op.add_column(
            "transaction",
            sa.Column(
                "is_refund_confirmed",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
        )

    if "created_by" not in transaction_columns:
        op.add_column(
            "transaction",
            sa.Column("created_by", sa.Uuid(), nullable=True),
        )
        op.create_index(
            op.f("ix_transaction_created_by"),
            "transaction",
            ["created_by"],
            unique=False,
        )
        op.create_foreign_key(
            "fk_transaction_created_by_user",
            "transaction",
            "user",
            ["created_by"],
            ["id"],
        )

    if "ticket_id" in transaction_columns and "linked_ticket_id" in get_transaction_columns():
        bind.execute(
            sa.text(
                """
                UPDATE "transaction"
                SET linked_ticket_id = ticket_id
                WHERE linked_ticket_id IS NULL
                  AND ticket_id IS NOT NULL
                """
            )
        )

    bind.execute(
        sa.text(
            """
            UPDATE "transaction"
            SET category = 'TICKET_PURCHASE'
            WHERE category IS NULL
            """
        )
    )

    actor_id = bind.execute(
        sa.text(
            """
            SELECT id
            FROM "user"
            WHERE role = 'ADMIN'
            ORDER BY username
            LIMIT 1
            """
        )
    ).scalar()
    if actor_id is None:
        actor_id = bind.execute(
            sa.text(
                """
                SELECT id
                FROM "user"
                ORDER BY username
                LIMIT 1
                """
            )
        ).scalar()

    if "created_by" in get_transaction_columns():
        if actor_id is None:
            raise RuntimeError(
                "Cannot backfill transaction.created_by because no user exists. "
                "Seed at least one admin/user before running this migration."
            )

        bind.execute(
            sa.text(
                """
                UPDATE "transaction"
                SET created_by = :actor_id
                WHERE created_by IS NULL
                """
            ),
            {"actor_id": actor_id},
        )

        op.alter_column(
            "transaction",
            "created_by",
            existing_type=sa.Uuid(),
            nullable=False,
        )

    op.alter_column(
        "transaction",
        "category",
        existing_type=transaction_category_enum,
        nullable=False,
        server_default=None,
    )
    op.alter_column(
        "transaction",
        "is_refund_confirmed",
        existing_type=sa.Boolean(),
        server_default=None,
    )
    op.alter_column(
        "transaction",
        "note",
        existing_type=sa.String(length=500),
        type_=sa.Text(),
        existing_nullable=True,
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    is_postgresql = bind.dialect.name == "postgresql"
    transaction_columns = {
        column["name"] for column in inspector.get_columns("transaction")
    }

    if is_postgresql:
        for table_name in ("transaction", "ticket", "customer", "user"):
            op.alter_column(
                table_name,
                "id",
                existing_type=sa.Uuid(),
                server_default=None,
            )

    if "created_by" in transaction_columns:
        foreign_keys = {
            fk["name"] for fk in inspector.get_foreign_keys("transaction") if fk["name"]
        }
        if "fk_transaction_created_by_user" in foreign_keys:
            op.drop_constraint(
                "fk_transaction_created_by_user",
                "transaction",
                type_="foreignkey",
            )
        indexes = {
            index["name"] for index in inspector.get_indexes("transaction")
        }
        if op.f("ix_transaction_created_by") in indexes:
            op.drop_index(op.f("ix_transaction_created_by"), table_name="transaction")
        op.drop_column("transaction", "created_by")

    if "is_refund_confirmed" in transaction_columns:
        op.drop_column("transaction", "is_refund_confirmed")

    if "linked_ticket_id" in transaction_columns:
        foreign_keys = {
            fk["name"] for fk in inspector.get_foreign_keys("transaction") if fk["name"]
        }
        if "fk_transaction_linked_ticket_id_ticket" in foreign_keys:
            op.drop_constraint(
                "fk_transaction_linked_ticket_id_ticket",
                "transaction",
                type_="foreignkey",
            )
        indexes = {
            index["name"] for index in inspector.get_indexes("transaction")
        }
        if op.f("ix_transaction_linked_ticket_id") in indexes:
            op.drop_index(
                op.f("ix_transaction_linked_ticket_id"),
                table_name="transaction",
            )
        op.drop_column("transaction", "linked_ticket_id")

    if "evidence_url" in transaction_columns:
        op.drop_column("transaction", "evidence_url")

    if "category" in transaction_columns:
        op.drop_column("transaction", "category")

    transaction_category_enum.drop(bind, checkfirst=True)
