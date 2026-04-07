"""
Centralised Enum definitions for Bay Buddy domain models.

All enums follow the naming conventions in docs/DICTIONARY.md and
the schema described in docs/ARCHITECT.md.
"""

import enum
import uuid


class UserRole(str, enum.Enum):
    """Roles available to internal system users."""

    ADMIN = "ADMIN"
    STAFF = "STAFF"


class CustomerType(str, enum.Enum):
    """Distinguishes individual travellers from corporate/business accounts."""

    INDIVIDUAL = "INDIVIDUAL"
    BUSINESS = "BUSINESS"


class Airline(str, enum.Enum):
    """Supported Vietnamese airlines mapped to their IATA-style codes."""

    VNA = "VNA"  # Vietnam Airlines
    VJ = "VJ"    # Vietjet Air
    QH = "QH"    # Bamboo Airways
    VU = "VU"    # Vietravel Airlines


class TransactionType(str, enum.Enum):
    """Types of financial transactions that affect a Customer's balance (công nợ)."""

    PAYMENT = "PAYMENT"  # Customer pays off debt
    CHARGE = "CHARGE"    # A ticket / charge is added to the customer's debt
    REFUND = "REFUND"    # A refund is credited back to the customer


class TransactionCategory(str, enum.Enum):
    """Vietnamese-market transaction categories used for reconciliation and audit."""

    TICKET_PURCHASE = "TICKET_PURCHASE"
    PAYMENT = "PAYMENT"
    DISCOUNT = "DISCOUNT"
    ADDITIONAL_FEE = "ADDITIONAL_FEE"
    REFUND = "REFUND"


class InvoiceStatus(str, enum.Enum):
    """Lifecycle state for quotes / invoices under VN financial workflows."""

    DRAFT = "DRAFT"
    ISSUED = "ISSUED"
    PAID = "PAID"
    CANCELLED = "CANCELLED"


class QuoteStatus(str, enum.Enum):
    """Lifecycle state for informational quotes."""

    DRAFT = "DRAFT"
    ACCEPTED = "ACCEPTED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


DEBT_INCREASING_TRANSACTION_CATEGORIES = frozenset(
    {
        TransactionCategory.TICKET_PURCHASE,
        TransactionCategory.ADDITIONAL_FEE,
        TransactionCategory.REFUND,
    }
)

DEBT_REDUCING_TRANSACTION_CATEGORIES = frozenset(
    {
        TransactionCategory.PAYMENT,
        TransactionCategory.DISCOUNT,
    }
)

CASH_MOVEMENT_TRANSACTION_CATEGORIES = frozenset(
    {
        TransactionCategory.PAYMENT,
        TransactionCategory.REFUND,
    }
)


def get_expected_transaction_type(
    transaction_category: TransactionCategory,
) -> TransactionType:
    """Return the legacy balance-direction enum expected for a category."""

    category_to_type = {
        TransactionCategory.TICKET_PURCHASE: TransactionType.CHARGE,
        TransactionCategory.PAYMENT: TransactionType.PAYMENT,
        TransactionCategory.DISCOUNT: TransactionType.PAYMENT,
        TransactionCategory.ADDITIONAL_FEE: TransactionType.CHARGE,
        TransactionCategory.REFUND: TransactionType.REFUND,
    }
    return category_to_type[transaction_category]


def get_default_transaction_category(
    transaction_type: TransactionType,
    linked_ticket_id: uuid.UUID | None = None,
) -> TransactionCategory:
    """Best-effort category for legacy rows that only stored the old `type`."""

    if transaction_type == TransactionType.CHARGE:
        if linked_ticket_id is not None:
            return TransactionCategory.TICKET_PURCHASE
        return TransactionCategory.ADDITIONAL_FEE

    if transaction_type == TransactionType.REFUND:
        return TransactionCategory.REFUND

    return TransactionCategory.PAYMENT


def get_transaction_balance_delta(
    *,
    amount: float,
    transaction_category: TransactionCategory | None = None,
    transaction_type: TransactionType | None = None,
    linked_ticket_id: uuid.UUID | None = None,
) -> float:
    """
    Convert a positive transaction amount into its signed balance impact.

    Positive deltas increase customer debt.
    Negative deltas reduce customer debt.
    """

    resolved_category = transaction_category
    if resolved_category is None:
        if transaction_type is None:
            raise ValueError(
                "transaction_type is required when transaction_category is missing."
            )
        resolved_category = get_default_transaction_category(
            transaction_type=transaction_type,
            linked_ticket_id=linked_ticket_id,
        )

    if resolved_category in DEBT_INCREASING_TRANSACTION_CATEGORIES:
        return amount

    return -amount


def is_cash_transaction_category(transaction_category: TransactionCategory) -> bool:
    """Return True when the category represents real cash movement."""

    return transaction_category in CASH_MOVEMENT_TRANSACTION_CATEGORIES


class TicketStatus(str, enum.Enum):
    """Lifecycle status of a ticket."""

    DRAFT = "DRAFT"          # Awaiting review, no financial impact
    CONFIRMED = "CONFIRMED"  # Saved, debt balance increased
    VOID = "VOID"            # Cancelled same day, debt reversed
    REFUNDED = "REFUNDED"    # Returned later, requires a credit transaction
