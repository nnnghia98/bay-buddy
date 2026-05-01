from __future__ import annotations

import argparse
import json
import uuid
from datetime import datetime
from pathlib import Path
import re
import sys

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from sqlmodel import Session, select

from database import engine
from models.customer import Customer
from models.enums import (
    Airline,
    CustomerType,
    TicketStatus,
    TransactionCategory,
    TransactionType,
    UserRole,
    get_transaction_balance_delta,
)
from models.ticket import Ticket
from models.transaction import Transaction
from models.user import User
from services.auth import hash_password


AIRLINE_MAP: dict[str, Airline] = {
    "VN": Airline.VNA,
    "VNA": Airline.VNA,
    "VJ": Airline.VJ,
    "QH": Airline.QH,
    "VU": Airline.VU,
}


def _to_datetime(value: str | None) -> datetime:
    if not value:
        return datetime.utcnow()
    return datetime.fromisoformat(value)


def _parse_itinerary(
    departure_raw: str | None,
    return_raw: str | None,
) -> tuple[str, str | None, str | None]:
    for candidate in (departure_raw, return_raw):
        if not candidate:
            continue
        upper = candidate.strip().upper()
        codes = re.findall(r"[A-Z]{3}", upper)
        if len(codes) >= 2:
            return f"{codes[0]}-{codes[-1]}", codes[0], codes[-1]
        if "-" in upper:
            parts = [segment.strip() for segment in upper.split("-") if segment.strip()]
            if len(parts) >= 2:
                dep = parts[0][:10]
                arr = parts[-1][:10]
                return f"{dep}-{arr}", dep, arr

    return "UNKNOWN-UNKNOWN", "UNKNOWN", "UNKNOWN"


def _ensure_actor_user(session: Session) -> User:
    actor = session.exec(
        select(User).where(User.is_active.is_(True)).order_by(User.username)
    ).first()
    if actor is not None:
        return actor

    actor = User(
        username="import_bot",
        role=UserRole.ADMIN,
        is_active=True,
        hashed_password=hash_password(f"import-bot-{uuid.uuid4()}"),
    )
    session.add(actor)
    session.flush()
    return actor


def _resolve_customer(session: Session, customer_name: str) -> Customer:
    normalised = " ".join(customer_name.split())
    customer = session.exec(
        select(Customer).where(Customer.name.ilike(normalised))  # type: ignore[attr-defined]
    ).first()
    if customer is not None:
        return customer

    customer = Customer(name=normalised, type=CustomerType.INDIVIDUAL, balance=0.0)
    session.add(customer)
    session.flush()
    return customer


def run_import(input_path: Path) -> dict[str, int]:
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    rows = payload["rows"]

    inserted = 0
    skipped = 0
    failed = 0

    with Session(engine) as session:
        actor = _ensure_actor_user(session)
        session.commit()

        for row in rows:
            source_row = row["source_row"]
            marker = f"[import ready_to_insert] source_row={source_row}"

            existing = session.exec(
                select(Transaction).where(Transaction.note == marker)
            ).first()
            if existing is not None:
                skipped += 1
                continue

            ticket_data = row["ticket"]
            pricing = row["pricing"]
            customer_name = row["customer_name"] or "UNKNOWN CUSTOMER"

            try:
                customer = _resolve_customer(session, customer_name)

                itinerary, departure_code, arrival_code = _parse_itinerary(
                    ticket_data.get("departure_raw"),
                    ticket_data.get("return_raw"),
                )
                occurred_at = _to_datetime(ticket_data.get("issued_at"))

                airline_raw = (ticket_data.get("airline_code") or "").strip().upper()
                airline = AIRLINE_MAP.get(airline_raw, Airline.VNA)

                net_price = float(pricing["system_price_k"])
                selling_price = float(pricing["customer_paid_n"])
                discount_raw = float(pricing["discount_m"])
                discount = abs(discount_raw) if discount_raw < 0 else 0.0

                ticket = Ticket(
                    pnr=(ticket_data.get("pnr") or "UNKNOWN")[:6].upper(),
                    airline=airline,
                    ticket_number=ticket_data.get("ticket_number"),
                    seat_code=None,
                    fare_class=ticket_data.get("ticket_type"),
                    passengers=[customer_name],
                    departure_place=ticket_data.get("departure_raw"),
                    arrival_place=ticket_data.get("return_raw"),
                    departure_code=departure_code,
                    arrival_code=arrival_code,
                    itinerary=itinerary,
                    flight_date=occurred_at,
                    net_price=net_price,
                    selling_price=selling_price,
                    discount=discount,
                    status=TicketStatus.CONFIRMED,
                    customer_id=customer.id,
                )
                session.add(ticket)
                session.flush()

                transaction = Transaction(
                    amount=selling_price,
                    type=TransactionType.CHARGE,
                    category=TransactionCategory.TICKET_PURCHASE,
                    method="Import JSON",
                    note=marker,
                    occurred_at=occurred_at,
                    customer_id=customer.id,
                    linked_ticket_id=ticket.id,
                    created_by=actor.id,
                )
                session.add(transaction)

                customer.balance += get_transaction_balance_delta(
                    amount=selling_price,
                    transaction_category=transaction.category,
                )
                session.add(customer)
                session.commit()
                inserted += 1
            except Exception:
                session.rollback()
                failed += 1

    return {"inserted": inserted, "skipped": skipped, "failed": failed}


def main() -> None:
    parser = argparse.ArgumentParser(description="Import ready_to_insert.json into Bay Buddy DB.")
    parser.add_argument(
        "--input",
        default="/Users/nnnghia98/Projects/bay-buddy/ready_to_insert.json",
        help="Absolute path to ready_to_insert.json",
    )
    args = parser.parse_args()
    summary = run_import(Path(args.input))
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
