"""Run production migrations with database and safety checks."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse

API_DIR = Path(__file__).resolve().parents[1]
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

from scripts.check_migration_safety import find_unsafe_operations  # noqa: E402


MIGRATIONS_DIR = API_DIR / "migrations" / "versions"
POSTGRES_SCHEMES = {"postgres", "postgresql"}


def validate_production_database_url(database_url: str | None) -> str:
    """Require a configured PostgreSQL URL before changing a live database."""

    if not database_url or not database_url.strip():
        raise RuntimeError(
            "DATABASE_URL is required for production migrations; refusing to use "
            "the local SQLite fallback."
        )

    parsed_url = urlparse(database_url)
    if parsed_url.scheme.split("+")[0].lower() not in POSTGRES_SCHEMES:
        raise RuntimeError(
            "Production migrations require a PostgreSQL DATABASE_URL; refusing "
            f"the {parsed_url.scheme or 'unknown'} database URL."
        )
    if not parsed_url.hostname:
        raise RuntimeError(
            "DATABASE_URL must include a PostgreSQL host for production migrations."
        )

    return database_url


def main() -> int:
    """Validate the production target, then apply pending migrations."""

    validate_production_database_url(os.getenv("DATABASE_URL"))

    findings = find_unsafe_operations(MIGRATIONS_DIR)
    if findings:
        print("Production migration refused by the safety check:")
        for finding in findings:
            print(f"- {finding.path}:{finding.line}: {finding.detail}")
        return 1

    print("Running Alembic migrations against the configured PostgreSQL database.")
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=API_DIR,
        check=True,
        env=os.environ.copy(),
    )
    print("Production migrations completed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
