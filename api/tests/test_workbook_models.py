"""Focused persistence tests for Workbook Editor V2 models."""

from __future__ import annotations

import uuid
from datetime import timezone

import pytest
from sqlalchemy import DateTime, event
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, SQLModel, create_engine

from models import (
    User,
    UserRole,
    Workbook,
    WorkbookOperation,
    WorkbookOperationType,
    WorkbookSession,
    WorkbookSessionStatus,
    WorkbookVersion,
)


def test_v2_models_use_namespaced_tables_and_foreign_keys() -> None:
    assert Workbook.__tablename__ == "workbook_editor_workbook"
    assert WorkbookSession.__tablename__ == "workbook_editor_session"
    assert WorkbookVersion.__tablename__ == "workbook_editor_version"
    assert WorkbookOperation.__tablename__ == "workbook_editor_operation"

    workbook_fk = next(iter(WorkbookSession.__table__.c.workbook_id.foreign_keys))
    version_fk = next(iter(WorkbookVersion.__table__.c.session_id.foreign_keys))
    operation_fk = next(iter(WorkbookOperation.__table__.c.session_id.foreign_keys))

    assert workbook_fk.target_fullname == "workbook_editor_workbook.id"
    assert version_fk.target_fullname == "workbook_editor_session.id"
    assert operation_fk.target_fullname == "workbook_editor_session.id"


@pytest.fixture()
def engine():
    database = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(database, "connect")
    def enable_foreign_keys(dbapi_connection, _connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    SQLModel.metadata.create_all(database)
    return database


def make_user(session: Session) -> User:
    user = User(
        username=f"workbook-{uuid.uuid4()}",
        email=f"workbook-{uuid.uuid4()}@example.com",
        full_name="Workbook Tester",
        role=UserRole.STAFF,
        hashed_password="not-used-in-model-tests",
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def make_workbook(session: Session, user_id: uuid.UUID) -> Workbook:
    workbook = Workbook(
        original_filename="prices.xlsx",
        original_relative_path=f"originals/{uuid.uuid4()}/source.xlsx",
        original_checksum="a" * 64,
        mime_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        file_size=512,
        sheet_count=1,
        sheet_metadata=[{"name": "Danh sách", "rows": 10}],
        created_by=user_id,
    )
    session.add(workbook)
    session.commit()
    session.refresh(workbook)
    return workbook


def make_workbook_session(
    session: Session,
    user_id: uuid.UUID,
    workbook_id: uuid.UUID,
) -> WorkbookSession:
    workbook_session = WorkbookSession(
        workbook_id=workbook_id,
        selected_sheet_name="Danh sách",
        header_row_number=2,
        column_mapping={"net_price": 8, "selling_price": 9},
        created_by=user_id,
    )
    session.add(workbook_session)
    session.commit()
    session.refresh(workbook_session)
    return workbook_session


def test_model_defaults_and_json_round_trip(engine) -> None:
    with Session(engine) as session:
        user = make_user(session)
        workbook = make_workbook(session, user.id)
        workbook_session = make_workbook_session(session, user.id, workbook.id)

        assert workbook.sheet_metadata == [{"name": "Danh sách", "rows": 10}]
        assert workbook.created_at.tzinfo is None  # SQLite drops timezone metadata.
        assert workbook_session.current_version == 1
        assert workbook_session.status == WorkbookSessionStatus.DRAFT
        assert workbook_session.display_name is None
        assert workbook_session.discarded_at is None
        assert workbook_session.column_mapping["net_price"] == 8
        assert (
            workbook_session.created_at.replace(tzinfo=timezone.utc).tzinfo
            is timezone.utc
        )


def test_version_number_is_unique_within_session(engine) -> None:
    with Session(engine) as session:
        user = make_user(session)
        workbook = make_workbook(session, user.id)
        workbook_session = make_workbook_session(session, user.id, workbook.id)
        values = {
            "session_id": workbook_session.id,
            "version_number": 1,
            "relative_path": "sessions/one/000001-one.xlsx",
            "checksum": "b" * 64,
            "file_size": 512,
            "change_summary": {},
            "created_by": user.id,
        }
        session.add(WorkbookVersion(**values))
        session.commit()
        session.add(WorkbookVersion(**values))

        with pytest.raises(IntegrityError):
            session.commit()


def test_immutable_storage_paths_are_globally_unique(engine) -> None:
    with Session(engine) as session:
        user = make_user(session)
        workbook = make_workbook(session, user.id)
        duplicate_source = Workbook(
            original_filename="duplicate.xlsx",
            original_relative_path=workbook.original_relative_path,
            original_checksum="f" * 64,
            mime_type=workbook.mime_type,
            file_size=1,
            sheet_count=1,
            sheet_metadata=[],
            created_by=user.id,
        )
        session.add(duplicate_source)
        with pytest.raises(IntegrityError):
            session.commit()

        session.rollback()
        workbook_session = make_workbook_session(session, user.id, workbook.id)
        version_values = {
            "session_id": workbook_session.id,
            "version_number": 1,
            "relative_path": "sessions/shared/000001.xlsx",
            "checksum": "1" * 64,
            "file_size": 1,
            "change_summary": {},
            "created_by": user.id,
        }
        session.add(WorkbookVersion(**version_values))
        session.commit()

        second_session = make_workbook_session(session, user.id, workbook.id)
        session.add(
            WorkbookVersion(
                **{
                    **version_values,
                    "session_id": second_session.id,
                }
            )
        )
        with pytest.raises(IntegrityError):
            session.commit()


def test_session_library_index_matches_recent_owner_queries() -> None:
    index = next(
        index
        for index in WorkbookSession.__table__.indexes
        if index.name == "ix_workbook_editor_session_owner_status_updated_at"
    )
    assert [column.name for column in index.columns] == [
        "created_by",
        "status",
        "updated_at",
    ]


def test_audit_columns_are_declared_timezone_aware() -> None:
    for model in (Workbook, WorkbookSession, WorkbookVersion, WorkbookOperation):
        for column_name in ("created_at",):
            column_type = model.__table__.c[column_name].type
            assert isinstance(column_type, DateTime)
            assert column_type.timezone is True

    for column_name in ("updated_at", "discarded_at"):
        column_type = WorkbookSession.__table__.c[column_name].type
        assert isinstance(column_type, DateTime)
        assert column_type.timezone is True


def test_operation_request_is_idempotent_per_session(engine) -> None:
    with Session(engine) as session:
        user = make_user(session)
        workbook = make_workbook(session, user.id)
        workbook_session = make_workbook_session(session, user.id, workbook.id)
        request_id = uuid.uuid4()
        values = {
            "session_id": workbook_session.id,
            "from_version": 1,
            "to_version": 2,
            "request_id": request_id,
            "operation_payload": {
                "changes": [{"row_number": 3, "selling_price": 1_250_000}]
            },
            "payload_checksum": "c" * 64,
            "changed_cells": 1,
            "created_by": user.id,
        }
        operation = WorkbookOperation(**values)
        session.add(operation)
        session.commit()
        session.refresh(operation)

        assert operation.operation_type == WorkbookOperationType.UPDATE_PRICES
        assert operation.operation_payload["changes"][0]["row_number"] == 3

        session.add(WorkbookOperation(**values))
        with pytest.raises(IntegrityError):
            session.commit()


@pytest.mark.parametrize(
    ("from_version", "to_version", "changed_cells"),
    [(2, 2, 1), (2, 4, 1), (2, 3, 0)],
)
def test_operation_requires_one_version_step_and_changed_cells(
    engine,
    from_version: int,
    to_version: int,
    changed_cells: int,
) -> None:
    with Session(engine) as session:
        user = make_user(session)
        workbook = make_workbook(session, user.id)
        workbook_session = make_workbook_session(session, user.id, workbook.id)
        session.add(
            WorkbookOperation(
                session_id=workbook_session.id,
                from_version=from_version,
                to_version=to_version,
                request_id=uuid.uuid4(),
                operation_payload={},
                payload_checksum="d" * 64,
                changed_cells=changed_cells,
                created_by=user.id,
            )
        )

        with pytest.raises(IntegrityError):
            session.commit()


def test_created_by_is_required(engine) -> None:
    with Session(engine) as session:
        make_user(session)

        session.add(
            Workbook(
                original_filename="missing-owner.xlsx",
                original_relative_path="originals/missing/source.xlsx",
                original_checksum="e" * 64,
                mime_type=(
                    "application/vnd.openxmlformats-officedocument."
                    "spreadsheetml.sheet"
                ),
                file_size=1,
                sheet_count=1,
                sheet_metadata=[],
                created_by=None,  # type: ignore[arg-type]
            )
        )
        with pytest.raises(IntegrityError):
            session.commit()
