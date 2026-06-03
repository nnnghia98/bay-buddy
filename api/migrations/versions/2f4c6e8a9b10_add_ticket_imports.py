"""add_ticket_imports

Revision ID: 2f4c6e8a9b10
Revises:     d4e5f6a7b8c9
Created at:  2026-05-31 00:00:00.000000+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "2f4c6e8a9b10"
down_revision: str | None = "d4e5f6a7b8c9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


source_enum = sa.Enum("INBOUND_EMAIL", "UPLOAD", name="ticketimportsource")
status_enum = sa.Enum("READY", "FAILED", "CONFIRMED", name="ticketimportstatus")

source_enum_pg = postgresql.ENUM(
    "INBOUND_EMAIL",
    "UPLOAD",
    name="ticketimportsource",
    create_type=False,
)
status_enum_pg = postgresql.ENUM(
    "READY",
    "FAILED",
    "CONFIRMED",
    name="ticketimportstatus",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    is_postgresql = bind.dialect.name == "postgresql"
    if is_postgresql:
        op.execute(sa.text('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'))

    source_enum.create(bind, checkfirst=True)
    status_enum.create(bind, checkfirst=True)
    source_type = source_enum_pg if is_postgresql else source_enum
    status_type = status_enum_pg if is_postgresql else status_enum
    json_type = postgresql.JSONB if is_postgresql else sa.JSON

    op.create_table(
        "ticket_import",
        sa.Column("source", source_type, nullable=False),
        sa.Column("status", status_type, nullable=False, server_default="READY"),
        sa.Column("sender_email", sa.String(length=255), nullable=True),
        sa.Column("recipient_email", sa.String(length=255), nullable=True),
        sa.Column("subject", sa.String(length=500), nullable=True),
        sa.Column("provider_message_id", sa.String(length=255), nullable=True),
        sa.Column("dedupe_key", sa.String(length=128), nullable=True),
        sa.Column("original_filename", sa.String(length=255), nullable=True),
        sa.Column("original_mime_type", sa.String(length=100), nullable=True),
        sa.Column("redaction_summary", json_type(), nullable=False),
        sa.Column("parsed_payload", json_type(), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column(
            "id",
            sa.Uuid(),
            nullable=False,
            server_default=sa.text("gen_random_uuid()") if is_postgresql else None,
        ),
        sa.Column("created_by", sa.Uuid(), nullable=True),
        sa.Column("linked_ticket_id", sa.Uuid(), nullable=True),
        sa.Column("original_content", sa.Text(), nullable=True),
        sa.Column("redacted_content", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["created_by"], ["user.id"]),
        sa.ForeignKeyConstraint(["linked_ticket_id"], ["ticket.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ticket_import_id"), "ticket_import", ["id"], unique=False)
    op.create_index(
        op.f("ix_ticket_import_created_by"),
        "ticket_import",
        ["created_by"],
        unique=False,
    )
    op.create_index(
        op.f("ix_ticket_import_created_at"),
        "ticket_import",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_ticket_import_updated_at"),
        "ticket_import",
        ["updated_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_ticket_import_provider_message_id"),
        "ticket_import",
        ["provider_message_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_ticket_import_dedupe_key"),
        "ticket_import",
        ["dedupe_key"],
        unique=True,
    )
    op.create_index(
        op.f("ix_ticket_import_linked_ticket_id"),
        "ticket_import",
        ["linked_ticket_id"],
        unique=False,
    )
    op.alter_column("ticket_import", "status", server_default=None)


def downgrade() -> None:
    op.drop_index(op.f("ix_ticket_import_linked_ticket_id"), table_name="ticket_import")
    op.drop_index(op.f("ix_ticket_import_dedupe_key"), table_name="ticket_import")
    op.drop_index(
        op.f("ix_ticket_import_provider_message_id"),
        table_name="ticket_import",
    )
    op.drop_index(op.f("ix_ticket_import_updated_at"), table_name="ticket_import")
    op.drop_index(op.f("ix_ticket_import_created_at"), table_name="ticket_import")
    op.drop_index(op.f("ix_ticket_import_created_by"), table_name="ticket_import")
    op.drop_index(op.f("ix_ticket_import_id"), table_name="ticket_import")
    op.drop_table("ticket_import")
    status_enum.drop(op.get_bind(), checkfirst=True)
    source_enum.drop(op.get_bind(), checkfirst=True)

