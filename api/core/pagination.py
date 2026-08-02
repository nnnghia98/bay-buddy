"""Small helpers shared by paginated API list endpoints."""

from __future__ import annotations

import math


DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 100


def normalize_page(value: int | None) -> int:
    """Return a safe one-based page number."""

    return max(1, value or 1)


def normalize_page_size(value: int | None, *, fallback: int = DEFAULT_PAGE_SIZE) -> int:
    """Return a bounded page size for public list endpoints."""

    return min(MAX_PAGE_SIZE, max(1, value or fallback))


def build_pagination(*, page: int, page_size: int, total: int) -> dict[str, int | bool]:
    """Build the metadata returned with a paginated collection."""

    total_pages = math.ceil(total / page_size) if total else 0
    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
        "has_next": page < total_pages,
    }
