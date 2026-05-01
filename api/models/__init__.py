"""
api/models – Bay Buddy SQLModel package.

Re-exports all table models and Pydantic schemas so that the rest of the
application only ever needs to import from `models`:

    from models import User, Ticket, Customer, Transaction

## Alembic / Migration note
Importing this package is the single authoritative action that registers
every table with SQLModel's shared SQLAlchemy MetaData object.
Alembic's `env.py` MUST import this package (or individual table classes)
before referencing `target_metadata`, otherwise autogenerate will produce
empty migrations.

Recommended pattern in `alembic/env.py`:

    import models  # noqa: F401 – registers all tables with SQLModel metadata
    from sqlmodel import SQLModel
    target_metadata = SQLModel.metadata

Import order matters for SQLAlchemy's relationship resolution – tables with
no FK dependencies (User, Customer) are imported before those that reference
them (Ticket, Transaction).
"""

from sqlmodel import SQLModel

from .enums import (
    Airline,
    CustomerType,
    InvoiceStatus,
    QuoteStatus,
    TransactionCategory,
    TransactionType,
    UserRole,
)
from .user import User, UserCreate, UserRead, UserUpdate
from .customer import Customer, CustomerCreate, CustomerRead, CustomerUpdate
from .ticket import Ticket, TicketCreate, TicketRead, TicketUpdate
from .invoice import (
    Invoice,
    InvoiceCreate,
    InvoiceDetail,
    InvoiceListFilters,
    InvoiceListItem,
    InvoicePublicBrand,
    InvoicePublicView,
    InvoiceRead,
    InvoiceUpdate,
    InvoiceStatusUpdate,
)
from .invoice_item import InvoiceItem, InvoiceItemCreate, InvoiceItemRead
from .quote import Quote, QuoteConvertResponse, QuoteCreate, QuoteDetail, QuoteRead
from .quote_item import QuoteItem, QuoteItemRead
from .transaction import Transaction, TransactionCreate, TransactionRead, TransactionUpdate

# Expose SQLModel.metadata so Alembic's env.py can do:
#   from models import metadata
#   target_metadata = metadata
metadata = SQLModel.metadata

__all__ = [
    # SQLAlchemy metadata – used by Alembic for autogenerate
    "SQLModel",
    "metadata",
    # Enums
    "UserRole",
    "CustomerType",
    "Airline",
    "InvoiceStatus",
    "QuoteStatus",
    "TransactionCategory",
    "TransactionType",
    # User
    "User",
    "UserCreate",
    "UserRead",
    "UserUpdate",
    # Customer
    "Customer",
    "CustomerCreate",
    "CustomerRead",
    "CustomerUpdate",
    # Ticket
    "Ticket",
    "TicketCreate",
    "TicketRead",
    "TicketUpdate",
    # Invoice
    "Invoice",
    "InvoiceCreate",
    "InvoiceDetail",
    "InvoiceListFilters",
    "InvoiceListItem",
    "InvoicePublicBrand",
    "InvoicePublicView",
    "InvoiceRead",
    "InvoiceUpdate",
    "InvoiceStatusUpdate",
    # InvoiceItem
    "InvoiceItem",
    "InvoiceItemCreate",
    "InvoiceItemRead",
    # Quote
    "Quote",
    "QuoteConvertResponse",
    "QuoteCreate",
    "QuoteDetail",
    "QuoteRead",
    # QuoteItem
    "QuoteItem",
    "QuoteItemRead",
    # Transaction
    "Transaction",
    "TransactionCreate",
    "TransactionRead",
    "TransactionUpdate",
]
