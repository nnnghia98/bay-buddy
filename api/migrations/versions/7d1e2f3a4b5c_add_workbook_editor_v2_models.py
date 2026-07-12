"""add_workbook_editor_v2_models

Revision ID: 7d1e2f3a4b5c
Revises:     f5c8a1d2e3b4
Created at:  2026-07-11 00:00:00.000000+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "7d1e2f3a4b5c"
down_revision: str | None = "f5c8a1d2e3b4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


session_status_enum = sa.Enum(
    "DRAFT",
    "COMPLETED",
    "DISCARDED",
    "FAILED",
    name="workbookeditorsessionstatus",
)
operation_type_enum = sa.Enum(
    "UPDATE_PRICES",
    name="workbookeditoroperationtype",
)
session_status_enum_pg = postgresql.ENUM(
    "DRAFT",
    "COMPLETED",
    "DISCARDED",
    "FAILED",
    name="workbookeditorsessionstatus",
    create_type=False,
)
operation_type_enum_pg = postgresql.ENUM(
    "UPDATE_PRICES",
    name="workbookeditoroperationtype",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    is_postgresql = bind.dialect.name == "postgresql"

    session_status_enum.create(bind, checkfirst=True)
    operation_type_enum.create(bind, checkfirst=True)
    session_status_type = (
        session_status_enum_pg if is_postgresql else session_status_enum
    )
    operation_type = operation_type_enum_pg if is_postgresql else operation_type_enum
    json_type = postgresql.JSONB if is_postgresql else sa.JSON
    uuid_default = sa.text("gen_random_uuid()") if is_postgresql else None

    op.create_table(
        "workbook_editor_workbook",
        sa.Column("id", sa.Uuid(), nullable=False, server_default=uuid_default),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("original_relative_path", sa.String(length=1024), nullable=False),
        sa.Column("original_checksum", sa.String(length=64), nullable=False),
        sa.Column("mime_type", sa.String(length=255), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("sheet_count", sa.Integer(), nullable=False),
        sa.Column("sheet_metadata", json_type(), nullable=False),
        sa.Column("created_by", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint(
            "file_size >= 0",
            name="ck_workbook_editor_workbook_file_size_nonnegative",
        ),
        sa.CheckConstraint(
            "sheet_count > 0",
            name="ck_workbook_editor_workbook_sheet_count_positive",
        ),
        sa.ForeignKeyConstraint(["created_by"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "original_relative_path",
            name="uq_workbook_editor_workbook_original_relative_path",
        ),
    )
    op.create_index(
        op.f("ix_workbook_editor_workbook_id"),
        "workbook_editor_workbook",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_workbook_editor_workbook_created_by"),
        "workbook_editor_workbook",
        ["created_by"],
        unique=False,
    )
    op.create_index(
        op.f("ix_workbook_editor_workbook_created_at"),
        "workbook_editor_workbook",
        ["created_at"],
        unique=False,
    )

    op.create_table(
        "workbook_editor_session",
        sa.Column("id", sa.Uuid(), nullable=False, server_default=uuid_default),
        sa.Column("workbook_id", sa.Uuid(), nullable=False),
        sa.Column("selected_sheet_name", sa.String(length=255), nullable=False),
        sa.Column("header_row_number", sa.Integer(), nullable=False),
        sa.Column("column_mapping", json_type(), nullable=False),
        sa.Column(
            "current_version",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
        sa.Column(
            "status",
            session_status_type,
            nullable=False,
            server_default="DRAFT",
        ),
        sa.Column("created_by", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint(
            "header_row_number > 0",
            name="ck_workbook_editor_session_header_row_positive",
        ),
        sa.CheckConstraint(
            "current_version > 0",
            name="ck_workbook_editor_session_current_version_positive",
        ),
        sa.ForeignKeyConstraint(["created_by"], ["user.id"]),
        sa.ForeignKeyConstraint(
            ["workbook_id"], ["workbook_editor_workbook.id"]
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ("id", "workbook_id", "created_by", "created_at", "updated_at"):
        op.create_index(
            op.f(f"ix_workbook_editor_session_{column}"),
            "workbook_editor_session",
            [column],
            unique=False,
        )

    op.create_table(
        "workbook_editor_version",
        sa.Column("id", sa.Uuid(), nullable=False, server_default=uuid_default),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("relative_path", sa.String(length=1024), nullable=False),
        sa.Column("checksum", sa.String(length=64), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("change_summary", json_type(), nullable=False),
        sa.Column("created_by", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint(
            "version_number > 0",
            name="ck_workbook_editor_version_number_positive",
        ),
        sa.CheckConstraint(
            "file_size >= 0",
            name="ck_workbook_editor_version_file_size_nonnegative",
        ),
        sa.ForeignKeyConstraint(["created_by"], ["user.id"]),
        sa.ForeignKeyConstraint(["session_id"], ["workbook_editor_session.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "relative_path",
            name="uq_workbook_editor_version_relative_path",
        ),
        sa.UniqueConstraint(
            "session_id",
            "version_number",
            name="uq_workbook_editor_version_session_version",
        ),
    )
    for column in ("id", "session_id", "created_by", "created_at"):
        op.create_index(
            op.f(f"ix_workbook_editor_version_{column}"),
            "workbook_editor_version",
            [column],
            unique=False,
        )

    op.create_table(
        "workbook_editor_operation",
        sa.Column("id", sa.Uuid(), nullable=False, server_default=uuid_default),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("from_version", sa.Integer(), nullable=False),
        sa.Column("to_version", sa.Integer(), nullable=False),
        sa.Column("request_id", sa.Uuid(), nullable=False),
        sa.Column(
            "operation_type",
            operation_type,
            nullable=False,
            server_default="UPDATE_PRICES",
        ),
        sa.Column("operation_payload", json_type(), nullable=False),
        sa.Column("payload_checksum", sa.String(length=64), nullable=False),
        sa.Column("changed_cells", sa.Integer(), nullable=False),
        sa.Column("created_by", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint(
            "from_version > 0",
            name="ck_workbook_editor_operation_from_version_positive",
        ),
        sa.CheckConstraint(
            "to_version = from_version + 1",
            name="ck_workbook_editor_operation_version_progression",
        ),
        sa.CheckConstraint(
            "changed_cells > 0",
            name="ck_workbook_editor_operation_changed_cells_positive",
        ),
        sa.ForeignKeyConstraint(["created_by"], ["user.id"]),
        sa.ForeignKeyConstraint(["session_id"], ["workbook_editor_session.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "session_id",
            "request_id",
            name="uq_workbook_editor_operation_session_request",
        ),
    )
    for column in ("id", "session_id", "created_by", "created_at"):
        op.create_index(
            op.f(f"ix_workbook_editor_operation_{column}"),
            "workbook_editor_operation",
            [column],
            unique=False,
        )


def downgrade() -> None:
    for table_name, columns in (
        (
            "workbook_editor_operation",
            ("created_at", "created_by", "session_id", "id"),
        ),
        (
            "workbook_editor_version",
            ("created_at", "created_by", "session_id", "id"),
        ),
        (
            "workbook_editor_session",
            ("updated_at", "created_at", "created_by", "workbook_id", "id"),
        ),
        ("workbook_editor_workbook", ("created_at", "created_by", "id")),
    ):
        for column in columns:
            op.drop_index(op.f(f"ix_{table_name}_{column}"), table_name=table_name)
        op.drop_table(table_name)

    bind = op.get_bind()
    operation_type_enum.drop(bind, checkfirst=True)
    session_status_enum.drop(bind, checkfirst=True)
