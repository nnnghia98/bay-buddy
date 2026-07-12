"""Integration tests for Workbook Editor V2 application orchestration."""

from __future__ import annotations

import hashlib
import io
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest
from openpyxl import Workbook as OpenpyxlWorkbook
from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine, select

from models import (
    User,
    UserRole,
    Workbook,
    WorkbookOperation,
    WorkbookSession,
    WorkbookVersion,
)
from services.workbook_mutation import PriceChange
import services.workbook_service as workbook_service
from services.workbook_service import (
    XLS_MIME_TYPE,
    XLSX_MIME_TYPE,
    WorkbookServiceError,
    create_editing_session,
    get_current_download,
    get_editing_session,
    get_latest_editing_session,
    read_session_records,
    save_session_changes,
    upload_workbook,
)
from services.workbook_validation import MappingStatus
from storage.workbooks import LocalWorkbookStorage


@pytest.fixture()
def engine():
    database = create_engine("sqlite://", connect_args={"check_same_thread": False})

    @event.listens_for(database, "connect")
    def enable_foreign_keys(dbapi_connection, _connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    SQLModel.metadata.create_all(database)
    return database


@pytest.fixture()
def storage(tmp_path: Path) -> LocalWorkbookStorage:
    return LocalWorkbookStorage(tmp_path / "objects")


def make_user(db: Session, role: UserRole = UserRole.STAFF) -> User:
    user = User(
        username=f"user-{uuid.uuid4()}",
        hashed_password="test-only",
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def workbook_bytes(*, mapped: bool = True) -> bytes:
    stream = io.BytesIO()
    workbook = OpenpyxlWorkbook()
    worksheet = workbook.active
    worksheet.title = "Tickets"
    if mapped:
        worksheet.append(
            ["Passenger Name", "PNR", "Ticket Number", "Cost Price", "Selling Price"]
        )
        worksheet.append(["Nguyễn An", "ABC123", "738001", 1_000_000, 1_200_000])
        worksheet.append(["Trần Bình", "DEF456", "738002", 2_000_000, 2_300_000])
    else:
        worksheet.append(["Passenger Name", "PNR"])
        worksheet.append(["Nguyễn An", "ABC123"])
    workbook.save(stream)
    workbook.close()
    return stream.getvalue()


def workbook_with_blank_header_bytes() -> bytes:
    stream = io.BytesIO()
    workbook = OpenpyxlWorkbook()
    worksheet = workbook.active
    worksheet.title = "Tickets"
    worksheet.append(["Passenger Name", "PNR", None, "Cost Price", "Selling Price"])
    worksheet.append(["Nguyễn An", "ABC123", "note", 1_000_000, 1_200_000])
    workbook.save(stream)
    workbook.close()
    return stream.getvalue()


def upload(
    db: Session,
    storage: LocalWorkbookStorage,
    actor: User,
    *,
    content: bytes | None = None,
):
    return upload_workbook(
        db,
        storage,
        actor=actor,
        filename="Bảng giá tháng 7.xlsx",
        mime_type=XLSX_MIME_TYPE,
        source=io.BytesIO(content if content is not None else workbook_bytes()),
        max_upload_bytes=5 * 1024 * 1024,
        max_rows=100,
        max_columns=20,
    )


def test_upload_persists_immutable_original_and_mapping(engine, storage) -> None:
    with Session(engine) as db:
        actor = make_user(db)
        content = workbook_bytes()
        result = upload(db, storage, actor, content=content)

        persisted = db.get(Workbook, result.id)
        assert persisted is not None
        assert result.checksum == hashlib.sha256(content).hexdigest()
        assert persisted.original_relative_path.startswith("originals/")
        assert Path(persisted.original_relative_path).is_absolute() is False
        assert result.sheets[0].mapping_status is MappingStatus.READY
        assert result.sheets[0].column_mapping["net_price"] == 4
        with storage.open_read(key=persisted.original_relative_path) as stored:
            assert stored.read() == content


def test_upload_normalizes_legacy_xls_before_publishing(
    engine,
    storage,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    converted = workbook_bytes()

    def convert(
        source: Path,
        target: Path,
        *,
        max_rows: int,
        max_columns: int,
    ) -> None:
        assert source.suffix == ".xls"
        assert target.suffix == ".xlsx"
        assert (max_rows, max_columns) == (100, 20)
        target.write_bytes(converted)

    monkeypatch.setattr(workbook_service, "convert_xls_to_xlsx", convert)

    with Session(engine) as db:
        actor = make_user(db)
        result = upload_workbook(
            db,
            storage,
            actor=actor,
            filename="Bảng giá tháng 7.xls",
            mime_type=XLS_MIME_TYPE,
            source=io.BytesIO(b"legacy-xls-content"),
            max_upload_bytes=5 * 1024 * 1024,
            max_rows=100,
            max_columns=20,
        )

        persisted = db.get(Workbook, result.id)
        assert persisted is not None
        assert result.original_filename.endswith(".xls")
        assert result.mime_type == XLSX_MIME_TYPE
        assert result.checksum == hashlib.sha256(converted).hexdigest()
        with storage.open_read(key=persisted.original_relative_path) as stored:
            assert stored.read() == converted


@pytest.mark.parametrize(
    ("filename", "mime_type", "limit", "code", "status"),
    [
        ("prices.csv", XLSX_MIME_TYPE, 10_000, "UNSUPPORTED_FILE_TYPE", 415),
        ("prices.xlsx", "text/plain", 10_000, "UNSUPPORTED_FILE_TYPE", 415),
        ("prices.xlsx", XLSX_MIME_TYPE, 10, "FILE_TOO_LARGE", 413),
    ],
)
def test_upload_rejects_type_and_size(
    engine,
    storage,
    filename: str,
    mime_type: str,
    limit: int,
    code: str,
    status: int,
) -> None:
    with Session(engine) as db:
        actor = make_user(db)
        with pytest.raises(WorkbookServiceError) as captured:
            upload_workbook(
                db,
                storage,
                actor=actor,
                filename=filename,
                mime_type=mime_type,
                source=io.BytesIO(workbook_bytes()),
                max_upload_bytes=limit,
                max_rows=100,
                max_columns=20,
            )
        assert captured.value.code == code
        assert captured.value.status_code == status
        assert db.exec(select(Workbook)).all() == []


def test_incomplete_mapping_warns_but_can_create_session(engine, storage) -> None:
    with Session(engine) as db:
        actor = make_user(db)
        result = upload(db, storage, actor, content=workbook_bytes(mapped=False))
        assert result.sheets[0].mapping_status is MappingStatus.MAPPING_INCOMPLETE

        session = create_editing_session(
            db,
            storage,
            actor=actor,
            workbook_id=result.id,
            sheet_name="Tickets",
        )
        assert session.selected_sheet_name == "Tickets"
        assert session.column_mapping == {"passenger_name": 1, "pnr": 2}

        before = read_session_records(
            db,
            storage,
            actor=actor,
            session_id=session.id,
        )
        assert [column.header for column in before.page.columns] == [
            "Passenger Name",
            "PNR",
        ]


def test_staff_ownership_is_hidden_while_admin_can_access(engine, storage) -> None:
    with Session(engine) as db:
        owner = make_user(db)
        other = make_user(db)
        admin = make_user(db, UserRole.ADMIN)
        uploaded = upload(db, storage, owner)
        editing = create_editing_session(
            db,
            storage,
            actor=owner,
            workbook_id=uploaded.id,
            sheet_name="Tickets",
        )

        with pytest.raises(WorkbookServiceError) as captured:
            get_editing_session(db, actor=other, session_id=editing.id)
        assert captured.value.code == "SESSION_NOT_FOUND"
        assert get_editing_session(
            db, actor=admin, session_id=editing.id
        ).id == editing.id

        with pytest.raises(WorkbookServiceError) as workbook_error:
            create_editing_session(
                db,
                storage,
                actor=other,
                workbook_id=uploaded.id,
                sheet_name="Tickets",
            )
        assert workbook_error.value.code == "WORKBOOK_NOT_FOUND"


def test_latest_session_restores_most_recent_active_session(engine, storage) -> None:
    with Session(engine) as db:
        actor = make_user(db)
        uploaded = upload(db, storage, actor)
        first = create_editing_session(
            db, storage, actor=actor, workbook_id=uploaded.id, sheet_name="Tickets"
        )
        second = create_editing_session(
            db, storage, actor=actor, workbook_id=uploaded.id, sheet_name="Tickets"
        )

        restored = get_latest_editing_session(db, actor=actor)

        assert restored.id == second.id
        assert restored.id != first.id


def test_latest_session_is_scoped_to_current_user(engine) -> None:
    with Session(engine) as db:
        actor = make_user(db)
        with pytest.raises(WorkbookServiceError) as captured:
            get_latest_editing_session(db, actor=actor)
        assert captured.value.code == "SESSION_NOT_FOUND"


def test_blank_source_headers_are_preserved_when_restored(engine, storage) -> None:
    with Session(engine) as db:
        actor = make_user(db)
        uploaded = upload(
            db, storage, actor, content=workbook_with_blank_header_bytes()
        )

        editing = create_editing_session(
            db, storage, actor=actor, workbook_id=uploaded.id, sheet_name="Tickets"
        )
        restored = get_latest_editing_session(db, actor=actor)

        assert editing.column_config[2]["label"] == ""
        assert restored.column_config[2]["label"] == ""


def test_sessions_are_independent_and_records_read_server_side(engine, storage) -> None:
    with Session(engine) as db:
        actor = make_user(db)
        uploaded = upload(db, storage, actor)
        first = create_editing_session(
            db,
            storage,
            actor=actor,
            workbook_id=uploaded.id,
            sheet_name="Tickets",
        )
        second = create_editing_session(
            db,
            storage,
            actor=actor,
            workbook_id=uploaded.id,
            sheet_name="Tickets",
        )
        versions = db.exec(select(WorkbookVersion)).all()
        assert len(versions) == 2
        assert versions[0].relative_path != versions[1].relative_path
        assert versions[0].checksum == uploaded.checksum == versions[1].checksum

        records = read_session_records(
            db,
            storage,
            actor=actor,
            session_id=first.id,
            search="nguyen an",
            page_size=1,
        )
        assert records.page.pagination.total == 1
        assert records.page.records[0].row_number == 2

        save_session_changes(
            db,
            storage,
            actor=actor,
            session_id=first.id,
            request_id=uuid.uuid4(),
            base_version=1,
            changes=[PriceChange(row_number=2, selling_price=1_300_000)],
        )
        untouched = read_session_records(
            db, storage, actor=actor, session_id=second.id
        )
        assert untouched.page.records[0].values["selling_price"] == 1_200_000


def test_save_versions_audits_replays_conflicts_and_downloads(engine, storage) -> None:
    with Session(engine) as db:
        actor = make_user(db)
        original = workbook_bytes()
        uploaded = upload(db, storage, actor, content=original)
        editing = create_editing_session(
            db,
            storage,
            actor=actor,
            workbook_id=uploaded.id,
            sheet_name="Tickets",
        )
        request_id = uuid.uuid4()
        changes = [PriceChange(row_number=2, net_price=1_050_000)]
        saved = save_session_changes(
            db,
            storage,
            actor=actor,
            session_id=editing.id,
            request_id=request_id,
            base_version=1,
            changes=changes,
        )
        assert saved.current_version == 2
        assert saved.changed_cells == 1
        assert saved.replayed is False
        assert saved.checksum != uploaded.checksum

        session_row = db.get(WorkbookSession, editing.id)
        assert session_row is not None and session_row.current_version == 2
        versions = db.exec(
            select(WorkbookVersion).where(
                WorkbookVersion.session_id == editing.id
            )
        ).all()
        operations = db.exec(
            select(WorkbookOperation).where(
                WorkbookOperation.session_id == editing.id
            )
        ).all()
        assert [version.version_number for version in versions] == [1, 2]
        assert len(operations) == 1
        assert operations[0].operation_payload["changes"][0]["old_value"] == 1_000_000
        assert operations[0].operation_payload["changes"][0]["new_value"] == 1_050_000

        replay = save_session_changes(
            db,
            storage,
            actor=actor,
            session_id=editing.id,
            request_id=request_id,
            base_version=1,
            changes=changes,
        )
        assert replay.replayed is True
        assert replay.current_version == 2
        assert len(db.exec(select(WorkbookOperation)).all()) == 1

        with pytest.raises(WorkbookServiceError) as reused:
            save_session_changes(
                db,
                storage,
                actor=actor,
                session_id=editing.id,
                request_id=request_id,
                base_version=1,
                changes=[PriceChange(row_number=2, net_price=1_060_000)],
            )
        assert reused.value.code == "IDEMPOTENCY_KEY_REUSED"
        assert reused.value.status_code == 409

        with pytest.raises(WorkbookServiceError) as stale:
            save_session_changes(
                db,
                storage,
                actor=actor,
                session_id=editing.id,
                request_id=uuid.uuid4(),
                base_version=1,
                changes=[PriceChange(row_number=2, net_price=1_060_000)],
            )
        assert stale.value.code == "VERSION_CONFLICT"
        assert stale.value.details == {"current_version": 2}

        descriptor = get_current_download(
            db, storage, actor=actor, session_id=editing.id
        )
        try:
            downloaded = descriptor.stream.read()
        finally:
            descriptor.stream.close()
        assert descriptor.filename.endswith("-edited-v2.xlsx")
        assert descriptor.version == 2
        assert descriptor.file_size == len(downloaded)
        assert descriptor.checksum == hashlib.sha256(downloaded).hexdigest()
        assert hashlib.sha256(original).hexdigest() == uploaded.checksum
        workbook_row = db.get(Workbook, uploaded.id)
        assert workbook_row is not None
        with storage.open_read(key=workbook_row.original_relative_path) as source:
            assert source.read() == original


def test_failed_save_rolls_back_version_operation_and_session(engine, storage) -> None:
    with Session(engine) as db:
        actor = make_user(db)
        uploaded = upload(db, storage, actor)
        editing = create_editing_session(
            db,
            storage,
            actor=actor,
            workbook_id=uploaded.id,
            sheet_name="Tickets",
        )

        with pytest.raises(WorkbookServiceError) as captured:
            save_session_changes(
                db,
                storage,
                actor=actor,
                session_id=editing.id,
                request_id=uuid.uuid4(),
                base_version=1,
                changes=[PriceChange(row_number=2, net_price=-1)],
            )

        assert captured.value.code == "INVALID_CELL_VALUE"
        session_row = db.get(WorkbookSession, editing.id)
        assert session_row is not None and session_row.current_version == 1
        assert len(db.exec(select(WorkbookVersion)).all()) == 1
        assert db.exec(select(WorkbookOperation)).all() == []


def test_download_rejects_corrupted_stored_version(engine, storage) -> None:
    with Session(engine) as db:
        actor = make_user(db)
        uploaded = upload(db, storage, actor)
        editing = create_editing_session(
            db,
            storage,
            actor=actor,
            workbook_id=uploaded.id,
            sheet_name="Tickets",
        )
        version = db.exec(
            select(WorkbookVersion).where(
                WorkbookVersion.session_id == editing.id,
                WorkbookVersion.version_number == 1,
            )
        ).one()
        (storage._root / version.relative_path).write_bytes(b"corrupt")

        with pytest.raises(WorkbookServiceError) as captured:
            get_current_download(
                db,
                storage,
                actor=actor,
                session_id=editing.id,
            )

        assert captured.value.code == "STORAGE_OBJECT_MISSING"


def test_sqlite_concurrent_replay_creates_one_version(
    tmp_path: Path,
) -> None:
    database = create_engine(
        f"sqlite:///{tmp_path / 'concurrent.db'}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(database)
    local_storage = LocalWorkbookStorage(tmp_path / "concurrent-storage")
    with Session(database) as setup_db:
        actor = make_user(setup_db)
        uploaded = upload(setup_db, local_storage, actor)
        editing = create_editing_session(
            setup_db,
            local_storage,
            actor=actor,
            workbook_id=uploaded.id,
            sheet_name="Tickets",
        )
        actor_id = actor.id

    request_id = uuid.uuid4()

    def save_once() -> bool:
        with Session(database) as worker_db:
            worker = worker_db.get(User, actor_id)
            assert worker is not None
            result = save_session_changes(
                worker_db,
                local_storage,
                actor=worker,
                session_id=editing.id,
                request_id=request_id,
                base_version=1,
                changes=[PriceChange(row_number=2, net_price=1_050_000)],
            )
            return result.replayed

    with ThreadPoolExecutor(max_workers=2) as executor:
        replayed = list(executor.map(lambda _index: save_once(), range(2)))

    assert sorted(replayed) == [False, True]
    with Session(database) as check_db:
        assert len(check_db.exec(select(WorkbookOperation)).all()) == 1
        assert len(check_db.exec(select(WorkbookVersion)).all()) == 2
