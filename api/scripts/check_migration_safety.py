"""Reject destructive operations in Alembic upgrade functions.

Production upgrades must preserve existing business data. Schema changes and
explicit backfills are allowed, but row/table deletion must be a separately
reviewed operation and must not be part of an automatic Railway deployment.

This is a static guard, not a replacement for migration review or backups. It
checks direct operations in each migration's ``upgrade()`` function, including
literal SQL passed to ``execute()``.
"""

from __future__ import annotations

import ast
import re
import sys
from dataclasses import dataclass
from pathlib import Path


DESTRUCTIVE_METHODS = {
    "drop_column",
    "drop_constraint",
    "drop_table",
    "truncate_table",
}
DESTRUCTIVE_SQL = re.compile(
    r"\b(?:delete\s+from|"
    r"truncate(?:\s+table)?|"
    r"drop\s+(?:schema|table|column|database))\b",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class MigrationFinding:
    """One potentially destructive operation found in an upgrade function."""

    path: Path
    line: int
    detail: str


def _upgrade_function(
    tree: ast.Module,
) -> ast.FunctionDef | ast.AsyncFunctionDef | None:
    """Return the module-level upgrade function, if one exists."""

    for node in tree.body:
        if (
            isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
            and node.name == "upgrade"
        ):
            return node
    return None


def _literal_strings(node: ast.AST) -> list[str]:
    """Collect literal strings nested in a call expression."""

    return [
        child.value
        for child in ast.walk(node)
        if isinstance(child, ast.Constant) and isinstance(child.value, str)
    ]


def find_unsafe_operations(migrations_dir: Path) -> list[MigrationFinding]:
    """Find destructive operations in migration upgrade functions."""

    findings: list[MigrationFinding] = []
    for path in sorted(migrations_dir.glob("*.py")):
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        upgrade = _upgrade_function(tree)
        if upgrade is None:
            continue

        for node in ast.walk(upgrade):
            if not isinstance(node, ast.Call):
                continue

            method_name = (
                node.func.attr if isinstance(node.func, ast.Attribute) else None
            )
            if method_name in DESTRUCTIVE_METHODS:
                findings.append(
                    MigrationFinding(
                        path=path,
                        line=node.lineno,
                        detail=f"destructive migration method: {method_name}()",
                    )
                )

            if method_name == "execute":
                for value in _literal_strings(node):
                    match = DESTRUCTIVE_SQL.search(value)
                    if match:
                        findings.append(
                            MigrationFinding(
                                path=path,
                                line=node.lineno,
                                detail=(
                                    "destructive SQL in execute(): "
                                    f"{match.group(0).upper()}"
                                ),
                            )
                        )
                        break

    return findings


def main() -> int:
    """Run the migration safety check from the API project directory."""

    migrations_dir = Path(__file__).resolve().parents[1] / "migrations" / "versions"
    findings = find_unsafe_operations(migrations_dir)
    if findings:
        print("Migration safety check failed:")
        for finding in findings:
            print(f"- {finding.path}:{finding.line}: {finding.detail}")
        print(
            "Move destructive data/schema changes out of automatic upgrade(), "
            "review them separately, and use a backup before production execution."
        )
        return 1

    migration_count = len(list(migrations_dir.glob("*.py")))
    print(
        "Migration safety check passed: "
        f"{migration_count} migration files contain no blocked destructive operation "
        "in upgrade()."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
