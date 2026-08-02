from pathlib import Path

import pytest

from scripts.check_migration_safety import find_unsafe_operations
from scripts.production_migrate import validate_production_database_url


MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "migrations" / "versions"


def test_current_migration_upgrades_have_no_blocked_destructive_operations() -> None:
    assert find_unsafe_operations(MIGRATIONS_DIR) == []


def test_destructive_operation_in_upgrade_is_rejected(tmp_path: Path) -> None:
    migration = tmp_path / "unsafe_migration.py"
    migration.write_text(
        """
def upgrade():
    op.execute('DELETE FROM customer')
    op.drop_column('customer', 'phone')

def downgrade():
    op.create_column('customer', 'phone')
""",
        encoding="utf-8",
    )

    findings = find_unsafe_operations(tmp_path)

    assert len(findings) == 2
    assert "DELETE FROM" in findings[0].detail
    assert "drop_column" in findings[1].detail


def test_destructive_operation_in_downgrade_is_allowed_by_upgrade_guard(
    tmp_path: Path,
) -> None:
    migration = tmp_path / "downgrade_only_migration.py"
    migration.write_text(
        """
def upgrade():
    op.add_column('customer', sa.Column('phone', sa.String()))

def downgrade():
    op.drop_column('customer', 'phone')
""",
        encoding="utf-8",
    )

    assert find_unsafe_operations(tmp_path) == []


@pytest.mark.parametrize("database_url", [None, "", "sqlite:///./bay_buddy.db"])
def test_production_migration_rejects_missing_or_sqlite_database(
    database_url: str | None,
) -> None:
    with pytest.raises(RuntimeError, match="PostgreSQL|DATABASE_URL"):
        validate_production_database_url(database_url)


def test_production_migration_accepts_postgresql_database() -> None:
    database_url = "postgresql+psycopg2://user:password@db.example.test/bay_buddy"

    assert validate_production_database_url(database_url) == database_url
