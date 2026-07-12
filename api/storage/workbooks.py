"""Immutable workbook object storage backed by a local filesystem."""

from __future__ import annotations

import hashlib
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import BinaryIO, Protocol


_COPY_CHUNK_SIZE = 1024 * 1024


@dataclass(frozen=True, slots=True)
class StoredObject:
    """Metadata calculated while publishing an immutable object."""

    key: str
    checksum: str
    size: int


class WorkbookStorage(Protocol):
    """Storage contract used by workbook business services."""

    def put_immutable(self, *, key: str, source: BinaryIO) -> StoredObject:
        """Publish source at a new key without replacing an existing object."""

    def open_read(self, *, key: str) -> BinaryIO:
        """Open an existing object for binary reading."""

    def exists(self, *, key: str) -> bool:
        """Return whether an object exists at key."""


class LocalWorkbookStorage:
    """Filesystem implementation constrained to an app-owned root directory."""

    def __init__(self, root: str | Path) -> None:
        self._root = Path(root).expanduser().resolve()
        self._root.mkdir(parents=True, exist_ok=True)

    def put_immutable(self, *, key: str, source: BinaryIO) -> StoredObject:
        normalized_key, destination = self._resolve_key(key)
        destination.parent.mkdir(parents=True, exist_ok=True)
        # Re-resolve after mkdir so symlinked parents cannot escape the root.
        normalized_key, destination = self._resolve_key(normalized_key)

        digest = hashlib.sha256()
        size = 0
        temporary_path: Path | None = None

        try:
            with tempfile.NamedTemporaryFile(
                mode="w+b",
                dir=destination.parent,
                prefix=f".{destination.name}.",
                suffix=".tmp",
                delete=False,
            ) as temporary:
                temporary_path = Path(temporary.name)
                while True:
                    chunk = source.read(_COPY_CHUNK_SIZE)
                    if not chunk:
                        break
                    if not isinstance(chunk, bytes):
                        raise TypeError("Workbook source must yield bytes.")
                    temporary.write(chunk)
                    digest.update(chunk)
                    size += len(chunk)
                temporary.flush()
                os.fsync(temporary.fileno())

            # A hard link atomically creates the final directory entry and fails
            # if it already exists, preserving immutable object semantics.
            os.link(temporary_path, destination)
            temporary_path.unlink()
            temporary_path = None
            self._fsync_directory(destination.parent)
        finally:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)

        return StoredObject(
            key=normalized_key,
            checksum=digest.hexdigest(),
            size=size,
        )

    def open_read(self, *, key: str) -> BinaryIO:
        _, path = self._resolve_key(key)
        return path.open("rb")

    def exists(self, *, key: str) -> bool:
        _, path = self._resolve_key(key)
        return path.is_file()

    def _resolve_key(self, key: str) -> tuple[str, Path]:
        if not isinstance(key, str) or not key or "\x00" in key:
            raise ValueError("Storage key must be a non-empty relative path.")
        if "\\" in key:
            raise ValueError("Storage key must use forward-slash separators.")

        relative = PurePosixPath(key)
        if relative.is_absolute() or any(part in {"", ".", ".."} for part in relative.parts):
            raise ValueError("Storage key must not be absolute or contain traversal.")

        current = self._root
        for part in relative.parts:
            current = current / part
            if current.is_symlink():
                raise ValueError("Storage keys must not traverse symbolic links.")

        normalized_key = relative.as_posix()
        candidate = (self._root / Path(*relative.parts)).resolve()
        try:
            candidate.relative_to(self._root)
        except ValueError as exc:
            raise ValueError("Storage key resolves outside the configured root.") from exc

        if candidate == self._root:
            raise ValueError("Storage key must identify an object.")
        return normalized_key, candidate

    @staticmethod
    def _fsync_directory(directory: Path) -> None:
        descriptor = os.open(directory, os.O_RDONLY)
        try:
            os.fsync(descriptor)
        finally:
            os.close(descriptor)
