"""make_ticket_pnr_non_unique

Revision ID: 1f8c6b2d9e10
Revises: 6c8d4e9a1b2f
Create Date: 2026-05-01 12:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "1f8c6b2d9e10"
down_revision: str | None = "6c8d4e9a1b2f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index(op.f("ix_ticket_pnr"), table_name="ticket")
    op.create_index(op.f("ix_ticket_pnr"), "ticket", ["pnr"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    duplicate_rows = bind.execute(
        sa.text("SELECT pnr FROM ticket GROUP BY pnr HAVING COUNT(*) > 1 LIMIT 1")
    )
    duplicate = duplicate_rows.fetchone()
    if duplicate is not None:
        raise RuntimeError(
            "Cannot restore unique ticket.pnr index while duplicate PNR rows exist."
        )

    op.drop_index(op.f("ix_ticket_pnr"), table_name="ticket")
    op.create_index(op.f("ix_ticket_pnr"), "ticket", ["pnr"], unique=True)
