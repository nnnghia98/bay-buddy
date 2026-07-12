"""Persistence models for immutable Workbook Editor V2 sessions."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import CheckConstraint, Column, DateTime, Enum, JSON, UniqueConstraint
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    """Return an aware UTC timestamp for persisted audit fields."""

    return datetime.now(timezone.utc)


class WorkbookSessionStatus(str, enum.Enum):
    """Lifecycle state of an independent workbook editing branch."""

    DRAFT = "DRAFT"
    COMPLETED = "COMPLETED"
    DISCARDED = "DISCARDED"
    FAILED = "FAILED"


class WorkbookOperationType(str, enum.Enum):
    """Audited mutation types supported by the MVP."""

    UPDATE_PRICES = "UPDATE_PRICES"


class Workbook(SQLModel, table=True):
    """Metadata for an immutable uploaded source workbook."""

    __tablename__ = "workbook_editor_workbook"
    __table_args__ = (
        UniqueConstraint(
            "original_relative_path",
            name="uq_workbook_editor_workbook_original_relative_path",
        ),
        CheckConstraint(
            "file_size >= 0",
            name="ck_workbook_editor_workbook_file_size_nonnegative",
        ),
        CheckConstraint(
            "sheet_count > 0",
            name="ck_workbook_editor_workbook_sheet_count_positive",
        ),
    )

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    original_filename: str = Field(max_length=255)
    original_relative_path: str = Field(max_length=1024)
    original_checksum: str = Field(max_length=64)
    mime_type: str = Field(max_length=255)
    file_size: int
    sheet_count: int
    sheet_metadata: list[dict[str, Any]] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False, default=list),
    )
    created_by: uuid.UUID = Field(
        foreign_key="user.id",
        index=True,
        nullable=False,
    )
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            default=utc_now,
            index=True,
        )
    )


class WorkbookSession(SQLModel, table=True):
    """An independently versioned editing branch of a workbook."""

    __tablename__ = "workbook_editor_session"
    __table_args__ = (
        CheckConstraint(
            "header_row_number > 0",
            name="ck_workbook_editor_session_header_row_positive",
        ),
        CheckConstraint(
            "current_version > 0",
            name="ck_workbook_editor_session_current_version_positive",
        ),
    )

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    workbook_id: uuid.UUID = Field(
        foreign_key="workbook_editor_workbook.id",
        index=True,
        nullable=False,
    )
    selected_sheet_name: str = Field(max_length=255)
    header_row_number: int
    column_mapping: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False, default=dict),
    )
    column_config: list[dict[str, Any]] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False, default=list),
    )
    current_version: int = Field(default=1)
    status: WorkbookSessionStatus = Field(
        default=WorkbookSessionStatus.DRAFT,
        sa_column=Column(
            Enum(WorkbookSessionStatus, name="workbookeditorsessionstatus"),
            nullable=False,
            default=WorkbookSessionStatus.DRAFT,
        ),
    )
    created_by: uuid.UUID = Field(
        foreign_key="user.id",
        index=True,
        nullable=False,
    )
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            default=utc_now,
            index=True,
        )
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            default=utc_now,
            index=True,
        )
    )


class WorkbookVersion(SQLModel, table=True):
    """Immutable file snapshot belonging to a workbook session."""

    __tablename__ = "workbook_editor_version"
    __table_args__ = (
        UniqueConstraint(
            "session_id",
            "version_number",
            name="uq_workbook_editor_version_session_version",
        ),
        UniqueConstraint(
            "relative_path",
            name="uq_workbook_editor_version_relative_path",
        ),
        CheckConstraint(
            "version_number > 0",
            name="ck_workbook_editor_version_number_positive",
        ),
        CheckConstraint(
            "file_size >= 0",
            name="ck_workbook_editor_version_file_size_nonnegative",
        ),
    )

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    session_id: uuid.UUID = Field(
        foreign_key="workbook_editor_session.id",
        index=True,
        nullable=False,
    )
    version_number: int
    relative_path: str = Field(max_length=1024)
    checksum: str = Field(max_length=64)
    file_size: int
    change_summary: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False, default=dict),
    )
    created_by: uuid.UUID = Field(
        foreign_key="user.id",
        index=True,
        nullable=False,
    )
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            default=utc_now,
            index=True,
        )
    )


class WorkbookOperation(SQLModel, table=True):
    """Idempotency and audit record for a workbook save operation."""

    __tablename__ = "workbook_editor_operation"
    __table_args__ = (
        UniqueConstraint(
            "session_id",
            "request_id",
            name="uq_workbook_editor_operation_session_request",
        ),
        CheckConstraint(
            "from_version > 0",
            name="ck_workbook_editor_operation_from_version_positive",
        ),
        CheckConstraint(
            "to_version = from_version + 1",
            name="ck_workbook_editor_operation_version_progression",
        ),
        CheckConstraint(
            "changed_cells > 0",
            name="ck_workbook_editor_operation_changed_cells_positive",
        ),
    )

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    session_id: uuid.UUID = Field(
        foreign_key="workbook_editor_session.id",
        index=True,
        nullable=False,
    )
    from_version: int
    to_version: int
    request_id: uuid.UUID
    operation_type: WorkbookOperationType = Field(
        default=WorkbookOperationType.UPDATE_PRICES,
        sa_column=Column(
            Enum(WorkbookOperationType, name="workbookeditoroperationtype"),
            nullable=False,
            default=WorkbookOperationType.UPDATE_PRICES,
        ),
    )
    operation_payload: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False, default=dict),
    )
    payload_checksum: str = Field(max_length=64)
    changed_cells: int
    created_by: uuid.UUID = Field(
        foreign_key="user.id",
        index=True,
        nullable=False,
    )
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            default=utc_now,
            index=True,
        )
    )
