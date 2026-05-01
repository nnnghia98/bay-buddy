"""add_ticket_number_and_route_fields

Revision ID: f19c2a6b7d41
Revises:     e7a1c2d4b8f3
Created at:  2026-04-27 09:30:00.000000+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "f19c2a6b7d41"
down_revision: str | None = "e7a1c2d4b8f3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("ticket", sa.Column("ticket_number", sa.String(length=50), nullable=True))
    op.add_column("ticket", sa.Column("departure_place", sa.String(length=255), nullable=True))
    op.add_column("ticket", sa.Column("arrival_place", sa.String(length=255), nullable=True))
    op.add_column("ticket", sa.Column("departure_code", sa.String(length=10), nullable=True))
    op.add_column("ticket", sa.Column("arrival_code", sa.String(length=10), nullable=True))
    op.create_index(op.f("ix_ticket_ticket_number"), "ticket", ["ticket_number"], unique=False)

    bind = op.get_bind()
    rows = bind.execute(sa.text('SELECT id, itinerary FROM ticket WHERE itinerary IS NOT NULL')).fetchall()

    for row in rows:
        itinerary = (row.itinerary or "").strip().upper()
        route_parts = [part.strip() for part in itinerary.split("-") if part.strip()]
        if len(route_parts) < 2:
            continue

        bind.execute(
            sa.text(
                """
                UPDATE ticket
                SET departure_code = :departure_code,
                    arrival_code = :arrival_code
                WHERE id = :ticket_id
                """
            ),
            {
                "ticket_id": row.id,
                "departure_code": route_parts[0],
                "arrival_code": route_parts[-1],
            },
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_ticket_ticket_number"), table_name="ticket")
    op.drop_column("ticket", "arrival_code")
    op.drop_column("ticket", "departure_code")
    op.drop_column("ticket", "arrival_place")
    op.drop_column("ticket", "departure_place")
    op.drop_column("ticket", "ticket_number")
