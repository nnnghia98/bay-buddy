"""Public transient extraction API: auth, input limits and safe responses."""
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from core.auth import get_current_user
from routes import ai
from schemas.identification import IdentificationResult


@pytest.fixture
def client(monkeypatch):
    app = FastAPI()
    app.include_router(ai.router, prefix="/ai")
    async def extract(documents, document_type):
        return IdentificationResult(
            document_type=document_type, document_number="001234567890",
            full_name="NGUYỄN VĂN AN", date_of_birth="1990-01-02",
        )
    monkeypatch.setattr(ai, "extract_identification", extract)
    with TestClient(app) as client:
        yield client, app


def test_identification_requires_auth_and_returns_transient_readable_values(client):
    client, app = client
    files = [("files", ("id.png", b"image", "image/png"))]
    assert client.post("/ai/identification", data={"document_type": "identity_card"}, files=files).status_code == 401
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="staff")
    response = client.post("/ai/identification", data={"document_type": "identity_card"}, files=files)
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    result = response.json()
    assert result["document_number"] == "001234567890"
    assert result["full_name"] == "NGUYỄN VĂN AN"
    assert result["date_of_birth"] == "1990-01-02"
    assert result["expiry_date"] is None


@pytest.mark.parametrize("files,status", [
    ([("files", ("id.txt", b"text", "text/plain"))], 415),
    ([("files", ("id.png", b"", "image/png"))], 422),
    ([("files", ("id.png", b"image", "image/png"))] * 3, 422),
    ([("files", ("id.png", b"x" * (10 * 1024 * 1024 + 1), "image/png"))], 413),
])
def test_invalid_uploads_are_rejected_before_provider_call(client, monkeypatch, files, status):
    client, app = client
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="staff")
    async def unexpected(documents, document_type):
        pytest.fail("Invalid upload reached the AI provider")
    monkeypatch.setattr(ai, "extract_identification", unexpected)
    assert client.post("/ai/identification", data={"document_type": "identity_card"}, files=files).status_code == status


def test_provider_errors_do_not_expose_document_contents(client, monkeypatch):
    client, app = client
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="staff")
    async def failed(documents, document_type):
        raise RuntimeError("private identity number 001234567890")
    monkeypatch.setattr(ai, "extract_identification", failed)
    response = client.post("/ai/identification", data={"document_type": "identity_card"}, files=[("files", ("id.png", b"image", "image/png"))])
    assert response.status_code == 503
    assert response.json() == {"detail": "Identification service is unavailable."}


def test_selected_document_type_is_preserved_and_mismatches_are_rejected(client, monkeypatch):
    client, app = client
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="staff")
    files = [("files", ("passport.png", b"image", "image/png"))]
    response = client.post("/ai/identification", data={"document_type": "passport"}, files=files)
    assert response.status_code == 200
    assert response.json()["document_type"] == "passport"

    async def wrong_type(documents, document_type):
        return IdentificationResult(document_type="identity_card")
    monkeypatch.setattr(ai, "extract_identification", wrong_type)
    assert client.post("/ai/identification", data={"document_type": "passport"}, files=files).status_code == 422
    assert client.post("/ai/identification", data={"document_type": "invalid"}, files=files).status_code == 422
