"""add_workbook_session_library_fields

Revision ID: 9f3b7d1e5a24
Revises: 8e2f3a4b5c6d
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "9f3b7d1e5a24"
down_revision: str | None = "8e2f3a4b5c6d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_INDEX_NAME = "ix_workbook_editor_session_owner_status_updated_at"
_TABLE_NAME = "workbook_editor_session"


def upgrade() -> None:
    op.add_column(
        _TABLE_NAME,
        sa.Column("display_name", sa.String(length=255), nullable=True),
    )
    op.add_column(
        _TABLE_NAME,
        sa.Column("discarded_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        _INDEX_NAME,
        _TABLE_NAME,
        ["created_by", "status", "updated_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(_INDEX_NAME, table_name=_TABLE_NAME)
    op.drop_column(_TABLE_NAME, "discarded_at")
    op.drop_column(_TABLE_NAME, "display_name")
