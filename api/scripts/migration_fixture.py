"""Seed and verify data for the PostgreSQL migration preservation check."""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from sqlalchemy import create_engine, text

API_DIR = Path(__file__).resolve().parents[1]
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

from scripts.production_migrate import validate_production_database_url  # noqa: E402


FIXTURE_USERNAME = "migration-fixture-admin"
FIXTURE_CUSTOMER_NAME = "Migration Fixture Customer"
FIXTURE_PNR = "MIG001"
FIXTURE_AMOUNT = 123456.0


def _connection():
    database_url = validate_production_database_url(os.getenv("DATABASE_URL"))
    return create_engine(database_url).begin()


def seed_fixture() -> None:
    """Insert stable sentinel rows into the schema-only base revision."""

    with _connection() as connection:
        user_id = connection.execute(
            text('SELECT id FROM "user" WHERE username = :username'),
            {"username": FIXTURE_USERNAME},
        ).scalar()
        if user_id is None:
            user_id = str(uuid4())
            connection.execute(
                text(
                    'INSERT INTO "user" '
                    "(id, username, role, is_active, hashed_password) "
                    "VALUES (:id, :username, 'ADMIN', TRUE, :hashed_password)"
                ),
                {
                    "id": user_id,
                    "username": FIXTURE_USERNAME,
                    "hashed_password": "migration-fixture-not-used",
                },
            )

        customer_id = connection.execute(
            text("SELECT id FROM customer WHERE name = :name"),
            {"name": FIXTURE_CUSTOMER_NAME},
        ).scalar()
        if customer_id is None:
            customer_id = str(uuid4())
            connection.execute(
                text(
                    "INSERT INTO customer (id, name, type, balance) "
                    "VALUES (:id, :name, 'INDIVIDUAL', :balance)"
                ),
                {
                    "id": customer_id,
                    "name": FIXTURE_CUSTOMER_NAME,
                    "balance": FIXTURE_AMOUNT,
                },
            )
        else:
            customer_id = str(customer_id)

        ticket_id = connection.execute(
            text("SELECT id FROM ticket WHERE pnr = :pnr"),
            {"pnr": FIXTURE_PNR},
        ).scalar()
        if ticket_id is None:
            ticket_id = str(uuid4())
            connection.execute(
                text(
                    "INSERT INTO ticket "
                    "(id, pnr, airline, itinerary, flight_date, net_price, "
                    "selling_price, status, customer_id, passengers) "
                    "VALUES (:id, :pnr, 'VNA', 'HAN-SGN', :flight_date, "
                    ":net_price, :selling_price, 'CONFIRMED', :customer_id, "
                    "CAST(:passengers AS json))"
                ),
                {
                    "id": ticket_id,
                    "pnr": FIXTURE_PNR,
                    "flight_date": datetime(2026, 1, 1),
                    "net_price": FIXTURE_AMOUNT,
                    "selling_price": FIXTURE_AMOUNT,
                    "customer_id": customer_id,
                    "passengers": json.dumps(["Migration Fixture Passenger"]),
                },
            )

        transaction_exists = connection.execute(
            text(
                'SELECT 1 FROM "transaction" '
                "WHERE note = :note LIMIT 1"
            ),
            {"note": "migration-fixture-transaction"},
        ).scalar()
        if transaction_exists is None:
            connection.execute(
                text(
                    'INSERT INTO "transaction" '
                    "(id, amount, type, method, note, customer_id, created_at) "
                    "VALUES (:id, :amount, 'CHARGE', 'Migration test', :note, "
                    ":customer_id, :created_at)"
                ),
                {
                    "id": str(uuid4()),
                    "amount": FIXTURE_AMOUNT,
                    "note": "migration-fixture-transaction",
                    "customer_id": customer_id,
                    "created_at": datetime(2026, 1, 1),
                },
            )


def verify_fixture() -> None:
    """Verify sentinel rows and important values after all upgrades."""

    with _connection() as connection:
        row = connection.execute(
            text(
                "SELECT customer.name, customer.balance, ticket.pnr, "
                '"transaction".amount, "transaction".created_by, '
                '"transaction".category '
                "FROM customer "
                "JOIN ticket ON ticket.customer_id = customer.id "
                'JOIN "transaction" ON "transaction".customer_id = customer.id '
                "WHERE customer.name = :customer_name "
                "AND ticket.pnr = :pnr "
                'AND "transaction".note = :note'
            ),
            {
                "customer_name": FIXTURE_CUSTOMER_NAME,
                "pnr": FIXTURE_PNR,
                "note": "migration-fixture-transaction",
            },
        ).one_or_none()

    if row is None:
        raise RuntimeError("Migration fixture rows were not preserved.")
    if row.name != FIXTURE_CUSTOMER_NAME or row.pnr != FIXTURE_PNR:
        raise RuntimeError("Migration fixture identity data changed.")
    if row.balance != FIXTURE_AMOUNT or row.amount != FIXTURE_AMOUNT:
        raise RuntimeError("Migration fixture financial data changed.")
    if row.created_by is None or row.category != "TICKET_PURCHASE":
        raise RuntimeError("Migration fixture audit data was not backfilled safely.")


def main() -> int:
    if len(sys.argv) != 2 or sys.argv[1] not in {"seed", "verify"}:
        print("Usage: python scripts/migration_fixture.py [seed|verify]")
        return 2

    if sys.argv[1] == "seed":
        seed_fixture()
        print("Migration preservation fixture seeded.")
    else:
        verify_fixture()
        print("Migration preservation fixture verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
