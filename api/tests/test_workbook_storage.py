"""Tests for safe immutable local workbook storage."""

from __future__ import annotations

import hashlib
import io
from pathlib import Path

import pytest

from core.settings import Settings
from storage.workbooks import LocalWorkbookStorage


class FailingSource:
    def __init__(self) -> None:
        self._reads = 0

    def read(self, size: int = -1) -> bytes:
        del size
        self._reads += 1
        if self._reads == 1:
            return b"partial workbook"
        raise OSError("source failed")


def test_put_immutable_streams_content_and_returns_metadata(tmp_path: Path) -> None:
    storage = LocalWorkbookStorage(tmp_path / "objects")
    content = b"PK\x03\x04example workbook bytes"

    stored = storage.put_immutable(
        key="originals/workbook-id/source.xlsx",
        source=io.BytesIO(content),
    )

    assert stored.key == "originals/workbook-id/source.xlsx"
    assert stored.size == len(content)
    assert stored.checksum == hashlib.sha256(content).hexdigest()
    assert (tmp_path / "objects" / stored.key).read_bytes() == content


def test_nested_key_can_be_opened_and_exists(tmp_path: Path) -> None:
    storage = LocalWorkbookStorage(tmp_path / "objects")
    key = "sessions/session-id/000001-version-id.xlsx"
    storage.put_immutable(key=key, source=io.BytesIO(b"version one"))

    assert storage.exists(key=key)
    assert not storage.exists(key="sessions/session-id/missing.xlsx")
    with storage.open_read(key=key) as stored_file:
        assert stored_file.read() == b"version one"


def test_put_immutable_never_overwrites_existing_object(tmp_path: Path) -> None:
    storage = LocalWorkbookStorage(tmp_path / "objects")
    key = "sessions/session-id/000001.xlsx"
    storage.put_immutable(key=key, source=io.BytesIO(b"first"))

    with pytest.raises(FileExistsError):
        storage.put_immutable(key=key, source=io.BytesIO(b"second"))

    with storage.open_read(key=key) as stored_file:
        assert stored_file.read() == b"first"


@pytest.mark.parametrize(
    "key",
    [
        "/absolute/source.xlsx",
        "../source.xlsx",
        "originals/../../source.xlsx",
        "originals/../source.xlsx",
        r"originals\..\source.xlsx",
        "",
    ],
)
def test_rejects_absolute_and_traversing_keys(tmp_path: Path, key: str) -> None:
    storage = LocalWorkbookStorage(tmp_path / "objects")

    with pytest.raises(ValueError):
        storage.put_immutable(key=key, source=io.BytesIO(b"content"))


def test_rejects_symlink_that_escapes_storage_root(tmp_path: Path) -> None:
    root = tmp_path / "objects"
    outside = tmp_path / "outside"
    root.mkdir()
    outside.mkdir()
    (root / "escaped").symlink_to(outside, target_is_directory=True)
    storage = LocalWorkbookStorage(root)

    with pytest.raises(ValueError, match="symbolic links"):
        storage.put_immutable(
            key="escaped/source.xlsx", source=io.BytesIO(b"content")
        )

    assert list(outside.iterdir()) == []


def test_rejects_symlink_even_when_target_stays_inside_root(tmp_path: Path) -> None:
    root = tmp_path / "objects"
    target = root / "actual"
    root.mkdir()
    target.mkdir()
    (root / "alias").symlink_to(target, target_is_directory=True)
    storage = LocalWorkbookStorage(root)

    with pytest.raises(ValueError, match="symbolic links"):
        storage.put_immutable(
            key="alias/source.xlsx",
            source=io.BytesIO(b"content"),
        )

    assert list(target.iterdir()) == []


def test_failed_write_removes_temporary_file(tmp_path: Path) -> None:
    root = tmp_path / "objects"
    storage = LocalWorkbookStorage(root)

    with pytest.raises(OSError, match="source failed"):
        storage.put_immutable(
            key="sessions/session-id/000001.xlsx",
            source=FailingSource(),  # type: ignore[arg-type]
        )

    destination_directory = root / "sessions" / "session-id"
    assert list(destination_directory.iterdir()) == []


def test_workbook_settings_have_bounded_local_defaults(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    for name in (
        "WORKBOOK_STORAGE_ROOT",
        "WORKBOOK_MAX_UPLOAD_BYTES",
        "WORKBOOK_MAX_ROWS",
        "WORKBOOK_MAX_COLUMNS",
        "WORKBOOK_MAX_PAGE_SIZE",
    ):
        monkeypatch.delenv(name, raising=False)

    configured = Settings()

    assert configured.workbook_storage_root == "storage/workbooks"
    assert configured.workbook_max_upload_bytes == 20 * 1024 * 1024
    assert configured.workbook_max_rows == 20_000
    assert configured.workbook_max_columns == 100
    assert configured.workbook_max_page_size == 200


def test_workbook_settings_accept_environment_overrides(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("WORKBOOK_STORAGE_ROOT", "/tmp/workbooks")
    monkeypatch.setenv("WORKBOOK_MAX_UPLOAD_BYTES", "1024")
    monkeypatch.setenv("WORKBOOK_MAX_ROWS", "500")
    monkeypatch.setenv("WORKBOOK_MAX_COLUMNS", "25")
    monkeypatch.setenv("WORKBOOK_MAX_PAGE_SIZE", "75")

    configured = Settings()

    assert configured.workbook_storage_root == "/tmp/workbooks"
    assert configured.workbook_max_upload_bytes == 1024
    assert configured.workbook_max_rows == 500
    assert configured.workbook_max_columns == 25
    assert configured.workbook_max_page_size == 75


@pytest.mark.parametrize(
    "name",
    [
        "WORKBOOK_MAX_UPLOAD_BYTES",
        "WORKBOOK_MAX_ROWS",
        "WORKBOOK_MAX_COLUMNS",
        "WORKBOOK_MAX_PAGE_SIZE",
    ],
)
def test_workbook_settings_reject_nonpositive_limits(
    monkeypatch: pytest.MonkeyPatch,
    name: str,
) -> None:
    monkeypatch.setenv(name, "0")

    with pytest.raises(ValueError, match=name):
        Settings()
