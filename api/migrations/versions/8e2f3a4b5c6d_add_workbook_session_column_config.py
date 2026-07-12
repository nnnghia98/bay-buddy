"""add_workbook_session_column_config

Revision ID: 8e2f3a4b5c6d
Revises: 7d1e2f3a4b5c
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "8e2f3a4b5c6d"
down_revision: str | None = "7d1e2f3a4b5c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    json_type = postgresql.JSONB if op.get_bind().dialect.name == "postgresql" else sa.JSON
    op.add_column(
        "workbook_editor_session",
        sa.Column(
            "column_config",
            json_type(),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
    )


def downgrade() -> None:
    op.drop_column("workbook_editor_session", "column_config")
