"""add_invoice_models

Revision ID: 4f2b9f4f9c2a
Revises:     30a1ef122c58
Created at:  2026-04-05 13:55:00.000000+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "4f2b9f4f9c2a"
down_revision: str | None = "30a1ef122c58"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


invoice_status_enum = sa.Enum(
    "DRAFT",
    "ISSUED",
    "PAID",
    "CANCELLED",
    name="invoicestatus",
)

invoice_status_enum_pg = postgresql.ENUM(
    "DRAFT",
    "ISSUED",
    "PAID",
    "CANCELLED",
    name="invoicestatus",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    is_postgresql = bind.dialect.name == "postgresql"

    if is_postgresql:
        op.execute(sa.text('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'))

    invoice_status_enum.create(bind, checkfirst=True)
    status_column_type = invoice_status_enum_pg if is_postgresql else invoice_status_enum

    op.create_table(
        "invoice",
        sa.Column("invoice_number", sa.String(length=32), nullable=False),
        sa.Column("customer_id", sa.Uuid(), nullable=False),
        sa.Column("total_amount", sa.Float(), nullable=False),
        sa.Column("tax_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("discount_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("status", status_column_type, nullable=False, server_default="DRAFT"),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("issued_at", sa.DateTime(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False, server_default=sa.text("gen_random_uuid()") if is_postgresql else None),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["customer.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_invoice_customer_id"), "invoice", ["customer_id"], unique=False)
    op.create_index(op.f("ix_invoice_id"), "invoice", ["id"], unique=False)
    op.create_index(op.f("ix_invoice_invoice_number"), "invoice", ["invoice_number"], unique=True)

    op.create_table(
        "invoice_item",
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("unit_price", sa.Float(), nullable=False),
        sa.Column("total", sa.Float(), nullable=False),
        sa.Column("linked_ticket_id", sa.Uuid(), nullable=True),
        sa.Column("invoice_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False, server_default=sa.text("gen_random_uuid()") if is_postgresql else None),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoice.id"]),
        sa.ForeignKeyConstraint(["linked_ticket_id"], ["ticket.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_invoice_item_id"), "invoice_item", ["id"], unique=False)
    op.create_index(op.f("ix_invoice_item_invoice_id"), "invoice_item", ["invoice_id"], unique=False)
    op.create_index(op.f("ix_invoice_item_linked_ticket_id"), "invoice_item", ["linked_ticket_id"], unique=False)

    op.add_column(
        "transaction",
        sa.Column("is_invoiced", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "transaction",
        sa.Column("invoice_id", sa.Uuid(), nullable=True),
    )
    op.create_index(op.f("ix_transaction_invoice_id"), "transaction", ["invoice_id"], unique=False)
    op.create_foreign_key(
        "fk_transaction_invoice_id_invoice",
        "transaction",
        "invoice",
        ["invoice_id"],
        ["id"],
    )

    op.alter_column("invoice", "tax_amount", server_default=None)
    op.alter_column("invoice", "discount_amount", server_default=None)
    op.alter_column("invoice", "status", server_default=None)
    op.alter_column("transaction", "is_invoiced", server_default=None)


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    transaction_indexes = {index["name"] for index in inspector.get_indexes("transaction")}
    transaction_foreign_keys = {
        foreign_key["name"] for foreign_key in inspector.get_foreign_keys("transaction") if foreign_key["name"]
    }

    if "fk_transaction_invoice_id_invoice" in transaction_foreign_keys:
        op.drop_constraint("fk_transaction_invoice_id_invoice", "transaction", type_="foreignkey")
    if op.f("ix_transaction_invoice_id") in transaction_indexes:
        op.drop_index(op.f("ix_transaction_invoice_id"), table_name="transaction")
    op.drop_column("transaction", "invoice_id")
    op.drop_column("transaction", "is_invoiced")

    op.drop_index(op.f("ix_invoice_item_linked_ticket_id"), table_name="invoice_item")
    op.drop_index(op.f("ix_invoice_item_invoice_id"), table_name="invoice_item")
    op.drop_index(op.f("ix_invoice_item_id"), table_name="invoice_item")
    op.drop_table("invoice_item")

    op.drop_index(op.f("ix_invoice_invoice_number"), table_name="invoice")
    op.drop_index(op.f("ix_invoice_id"), table_name="invoice")
    op.drop_index(op.f("ix_invoice_customer_id"), table_name="invoice")
    op.drop_table("invoice")

    invoice_status_enum.drop(op.get_bind(), checkfirst=True)
