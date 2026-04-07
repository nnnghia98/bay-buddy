"""add_customer_contact_fields

Revision ID: 8d13f7f6f0d2
Revises:     4f2b9f4f9c2a
Created at:  2026-04-07 03:40:00.000000+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "8d13f7f6f0d2"
down_revision: str | None = "4f2b9f4f9c2a"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("customer", sa.Column("email", sa.String(length=255), nullable=True))
    op.add_column("customer", sa.Column("phone", sa.String(length=30), nullable=True))
    op.add_column("customer", sa.Column("address", sa.String(length=500), nullable=True))
    op.add_column("customer", sa.Column("tax_code", sa.String(length=100), nullable=True))
    op.create_index(op.f("ix_customer_email"), "customer", ["email"], unique=True)
    op.create_index(op.f("ix_customer_tax_code"), "customer", ["tax_code"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_customer_tax_code"), table_name="customer")
    op.drop_index(op.f("ix_customer_email"), table_name="customer")
    op.drop_column("customer", "tax_code")
    op.drop_column("customer", "address")
    op.drop_column("customer", "phone")
    op.drop_column("customer", "email")
