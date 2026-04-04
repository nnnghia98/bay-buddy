"""
routes – Bay Buddy API route handlers.

Each module defines a FastAPI APIRouter for a specific domain.
Routers are registered in main.py with appropriate prefixes and tags.
"""

from . import auth, ai, users, customers, tickets, transactions

__all__ = ["auth", "ai", "users", "customers", "tickets", "transactions"]
