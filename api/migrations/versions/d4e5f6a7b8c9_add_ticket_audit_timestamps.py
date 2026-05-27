"""add_ticket_audit_timestamps

Revision ID: d4e5f6a7b8c9
Revises:     b7c4d2e8f901
Created at:  2026-05-25 00:00:00.000000+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "d4e5f6a7b8c9"
down_revision: str | None = "b7c4d2e8f901"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "ticket",
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.add_column(
        "ticket",
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index("ix_ticket_created_at", "ticket", ["created_at"], unique=False)
    op.create_index("ix_ticket_updated_at", "ticket", ["updated_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_ticket_updated_at", table_name="ticket")
    op.drop_index("ix_ticket_created_at", table_name="ticket")
    op.drop_column("ticket", "updated_at")
    op.drop_column("ticket", "created_at")
