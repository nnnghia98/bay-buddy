"""
Centralised Enum definitions for Bay Buddy domain models.

All enums follow the naming conventions in docs/DICTIONARY.md and
the schema described in docs/ARCHITECT.md.
"""

import enum


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

class TicketStatus(str, enum.Enum):
    """Lifecycle status of a ticket."""
    
    DRAFT = "DRAFT"          # Awaiting review, no financial impact
    CONFIRMED = "CONFIRMED"  # Saved, debt balance increased
    VOID = "VOID"            # Cancelled same day, debt reversed
    REFUNDED = "REFUNDED"    # Returned later, requires a credit transaction
