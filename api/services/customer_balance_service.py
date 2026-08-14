from __future__ import annotations

import uuid
from datetime import datetime
from typing import Iterable

from sqlmodel import Session, select

from models.customer import Customer
from models.enums import get_transaction_balance_delta
from models.transaction import Transaction


def get_customer_balances(
    *,
    session: Session,
    customers: Iterable[Customer],
    base_datetime: datetime | None,
) -> dict[uuid.UUID, float]:
    """Return customer balances for the active app audit window."""

    customer_list = list(customers)
    customer_ids = [
        customer.id for customer in customer_list if customer.id is not None
    ]
    if not customer_ids:
        return {}

    if base_datetime is None:
        return {
            customer.id: customer.balance
            for customer in customer_list
            if customer.id is not None
        }

    transactions = session.exec(
        select(Transaction).where(
            Transaction.customer_id.in_(customer_ids),
            Transaction.created_at >= base_datetime,
        )
    ).all()
    balances = dict.fromkeys(customer_ids, 0.0)

    for transaction in transactions:
        balances[transaction.customer_id] += get_transaction_balance_delta(
            amount=transaction.amount,
            transaction_category=transaction.category,
            transaction_type=transaction.type,
            linked_ticket_id=transaction.linked_ticket_id,
        )

    return balances
