"""snapshot_quotes_and_invoice_locking

Revision ID: c0b9c7c2e8ab
Revises:     8d13f7f6f0d2
Created at:  2026-04-07 06:00:00.000000+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "c0b9c7c2e8ab"
down_revision: str | None = "8d13f7f6f0d2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


quote_status_enum = sa.Enum(
    "DRAFT",
    "ACCEPTED",
    "EXPIRED",
    "CANCELLED",
    name="quotestatus",
)

quote_status_enum_pg = postgresql.ENUM(
    "DRAFT",
    "ACCEPTED",
    "EXPIRED",
    "CANCELLED",
    name="quotestatus",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    is_postgresql = bind.dialect.name == "postgresql"
    if is_postgresql:
        op.execute(sa.text('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'))

    quote_status_enum.create(bind, checkfirst=True)
    quote_status_type = quote_status_enum_pg if is_postgresql else quote_status_enum

    op.add_column("invoice", sa.Column("customer_name_snapshot", sa.String(length=255), nullable=True))
    op.add_column("invoice", sa.Column("customer_address_snapshot", sa.String(length=500), nullable=True))
    op.add_column("invoice", sa.Column("customer_tax_code_snapshot", sa.String(length=100), nullable=True))
    op.add_column("invoice_item", sa.Column("unit_price_snapshot", sa.Float(), nullable=True))
    op.add_column("invoice_item", sa.Column("passenger_name_snapshot", sa.String(length=500), nullable=True))

    bind.execute(
        sa.text(
            """
            UPDATE invoice
            SET customer_name_snapshot = customer.name,
                customer_address_snapshot = customer.address,
                customer_tax_code_snapshot = customer.tax_code
            FROM customer
            WHERE invoice.customer_id = customer.id
            """
        )
    )
    bind.execute(
        sa.text(
            """
            UPDATE invoice_item
            SET unit_price_snapshot = unit_price,
                passenger_name_snapshot = COALESCE(
                    (
                        SELECT string_agg(passenger_name, ', ')
                        FROM jsonb_array_elements_text(ticket.passengers::jsonb) AS passenger_name
                    ),
                    ticket.pnr,
                    ''
                )
            FROM ticket
            WHERE invoice_item.linked_ticket_id = ticket.id
            """
        )
    )
    bind.execute(
        sa.text(
            """
            UPDATE invoice_item
            SET passenger_name_snapshot = 'SNAPSHOT MISSING'
            WHERE passenger_name_snapshot IS NULL
            """
        )
    )

    op.alter_column("invoice", "customer_name_snapshot", existing_type=sa.String(length=255), nullable=False)
    op.alter_column("invoice_item", "unit_price_snapshot", existing_type=sa.Float(), nullable=False)
    op.alter_column("invoice_item", "passenger_name_snapshot", existing_type=sa.String(length=500), nullable=False)

    op.create_table(
        "quote",
        sa.Column("quote_number", sa.String(length=32), nullable=False),
        sa.Column("customer_id", sa.Uuid(), nullable=False),
        sa.Column("customer_name_snapshot", sa.String(length=255), nullable=False),
        sa.Column("customer_address_snapshot", sa.String(length=500), nullable=True),
        sa.Column("customer_tax_code_snapshot", sa.String(length=100), nullable=True),
        sa.Column("total_amount", sa.Float(), nullable=False),
        sa.Column("tax_amount", sa.Float(), nullable=False),
        sa.Column("discount_amount", sa.Float(), nullable=False),
        sa.Column("valid_until", sa.DateTime(), nullable=False),
        sa.Column("status", quote_status_type, nullable=False, server_default="DRAFT"),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False, server_default=sa.text("gen_random_uuid()") if is_postgresql else None),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["customer.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_quote_id"), "quote", ["id"], unique=False)
    op.create_index(op.f("ix_quote_customer_id"), "quote", ["customer_id"], unique=False)
    op.create_index(op.f("ix_quote_quote_number"), "quote", ["quote_number"], unique=True)

    op.create_table(
        "quote_item",
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("unit_price", sa.Float(), nullable=False),
        sa.Column("unit_price_snapshot", sa.Float(), nullable=False),
        sa.Column("passenger_name_snapshot", sa.String(length=500), nullable=False),
        sa.Column("total", sa.Float(), nullable=False),
        sa.Column("linked_ticket_id", sa.Uuid(), nullable=True),
        sa.Column("quote_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False, server_default=sa.text("gen_random_uuid()") if is_postgresql else None),
        sa.ForeignKeyConstraint(["linked_ticket_id"], ["ticket.id"]),
        sa.ForeignKeyConstraint(["quote_id"], ["quote.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_quote_item_id"), "quote_item", ["id"], unique=False)
    op.create_index(op.f("ix_quote_item_linked_ticket_id"), "quote_item", ["linked_ticket_id"], unique=False)
    op.create_index(op.f("ix_quote_item_quote_id"), "quote_item", ["quote_id"], unique=False)

    op.alter_column("quote", "status", server_default=None)


def downgrade() -> None:
    op.drop_index(op.f("ix_quote_item_quote_id"), table_name="quote_item")
    op.drop_index(op.f("ix_quote_item_linked_ticket_id"), table_name="quote_item")
    op.drop_index(op.f("ix_quote_item_id"), table_name="quote_item")
    op.drop_table("quote_item")

    op.drop_index(op.f("ix_quote_quote_number"), table_name="quote")
    op.drop_index(op.f("ix_quote_customer_id"), table_name="quote")
    op.drop_index(op.f("ix_quote_id"), table_name="quote")
    op.drop_table("quote")

    op.drop_column("invoice_item", "passenger_name_snapshot")
    op.drop_column("invoice_item", "unit_price_snapshot")
    op.drop_column("invoice", "customer_tax_code_snapshot")
    op.drop_column("invoice", "customer_address_snapshot")
    op.drop_column("invoice", "customer_name_snapshot")

    quote_status_enum.drop(op.get_bind(), checkfirst=True)
