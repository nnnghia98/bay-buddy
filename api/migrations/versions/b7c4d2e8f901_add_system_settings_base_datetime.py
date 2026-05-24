"""add_system_settings_base_datetime

Revision ID: b7c4d2e8f901
Revises:     9b2a7c4d1e3f, a5f0d9e1c234
Created at:  2026-05-24 00:00:00.000000+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "b7c4d2e8f901"
down_revision: str | tuple[str, str] | None = (
    "9b2a7c4d1e3f",
    "a5f0d9e1c234",
)
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "system_setting",
        sa.Column("id", sa.String(length=50), nullable=False),
        sa.Column("base_datetime", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("system_setting")
