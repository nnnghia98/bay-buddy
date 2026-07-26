from __future__ import annotations

import pytest

from services.auth import create_access_token


def test_jwt_creation_requires_environment_secret(monkeypatch) -> None:
    monkeypatch.delenv("SECRET_KEY", raising=False)

    with pytest.raises(RuntimeError, match="SECRET_KEY is not configured"):
        create_access_token({"sub": "test-user"})


def test_jwt_creation_rejects_short_environment_secret(monkeypatch) -> None:
    monkeypatch.setenv("SECRET_KEY", "too-short")

    with pytest.raises(RuntimeError, match="at least 32 characters"):
        create_access_token({"sub": "test-user"})
