"""add_workbook_meaningful_bounds

Revision ID: a6c4e8f2b7d1
Revises: 9f3b7d1e5a24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "a6c4e8f2b7d1"
down_revision: str | None = "9f3b7d1e5a24"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_TABLE_NAME = "workbook_editor_session"


def upgrade() -> None:
    # Nullable keeps old sessions readable. Their stored upload inspection is
    # used as the fallback until the next structural mutation persists bounds.
    op.add_column(
        _TABLE_NAME,
        sa.Column("meaningful_max_row", sa.Integer(), nullable=True),
    )
    op.add_column(
        _TABLE_NAME,
        sa.Column("meaningful_max_column", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column(_TABLE_NAME, "meaningful_max_column")
    op.drop_column(_TABLE_NAME, "meaningful_max_row")
