import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select

from core.auth import get_current_user
from core.settings import settings
from database import get_session
from main import app
from models.enums import TicketImportSource, UserRole
from models.ticket_import import TicketImport
from models.user import User
from services.redaction_service import redact_ticket_html, redact_ticket_text


JETSTAR_HTML = """
<html>
  <body>
    <table>
      <tr>
        <td>
          <h3>Thanh toán của 45,896,096 VND<br>Đã Nhận Được</h3>
          <img alt="Barcode SQD35Q" src="https://example.com/barcode.png" />
          <p>Mã xác nhận đặt chỗ SQD35Q</p>
        </td>
      </tr>
      <tr><td><p>Giá vé: Vé Tiết kiệm</p></td></tr>
    </table>
  </body>
</html>
"""


def test_redact_ticket_html_removes_payment_block_and_keeps_fare_class():
    redacted, summary = redact_ticket_html(JETSTAR_HTML)

    assert "45,896,096 VND" not in redacted
    assert "Đã Nhận Được" not in redacted
    assert "data-bay-buddy-redacted" not in redacted
    assert "<h3>" not in redacted
    assert "barcode.png" in redacted
    assert "Barcode SQD35Q" in redacted
    assert "Giá vé: Vé Tiết kiệm" in redacted
    assert "SQD35Q" in redacted
    assert summary["strategy"] == "html_payment_removal"
    assert summary["removed_payment_blocks"] == 1
    assert summary["payment_amount_present"] is False


def test_redact_ticket_html_preserves_barcode_when_payment_shares_cell():
    raw_html = """
    <html>
      <body>
        <table>
          <tr>
            <td>
              <img alt="QR Code SQD35Q" src="https://example.com/qr.png" />
              Thanh toán của 45,896,096 VND<br>Đã Nhận Được
            </td>
          </tr>
          <tr><td>Mã xác nhận đặt chỗ SQD35Q</td></tr>
        </table>
      </body>
    </html>
    """

    redacted, summary = redact_ticket_html(raw_html)

    assert "45,896,096 VND" not in redacted
    assert "Đã Nhận Được" not in redacted
    assert "data-bay-buddy-redacted" not in redacted
    assert "qr.png" in redacted
    assert "QR Code SQD35Q" in redacted
    assert "SQD35Q" in redacted
    assert summary["strategy"] == "html_payment_removal"
    assert summary["removed_payment_blocks"] == 1
    assert summary["payment_amount_present"] is False


def test_redact_ticket_text_removes_payment_lines_and_keeps_fare_class():
    raw_text = "\n".join(
        [
            "Jetstar",
            "Thanh toán của 45,896,096 VND",
            "Đã Nhận Được",
            "Giá vé: Vé Tiết kiệm",
            "Mã xác nhận đặt chỗ SQD35Q",
        ]
    )

    redacted, summary = redact_ticket_text(raw_text)

    assert "45,896,096 VND" not in redacted
    assert "Đã Nhận Được" not in redacted
    assert "Giá vé: Vé Tiết kiệm" in redacted
    assert "SQD35Q" in redacted
    assert summary["removed_payment_lines"] == 2


def _build_client(tmp_path, *, webhook_secret: str | None = None):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'ticket-imports.db'}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    fake_user = User(
        id=uuid.uuid4(),
        username="ticket-importer",
        role=UserRole.STAFF,
        is_active=True,
        hashed_password="hashed-password",
    )

    def override_get_current_user() -> User:
        return fake_user

    def override_get_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_session] = override_get_session
    original_secret = settings.ticket_import_webhook_secret
    settings.ticket_import_webhook_secret = webhook_secret

    return engine, original_secret


def _cleanup(original_secret: str | None) -> None:
    settings.ticket_import_webhook_secret = original_secret
    app.dependency_overrides.clear()


def test_upload_ticket_import_requires_authenticated_user_and_stores_safe_html(tmp_path):
    engine, original_secret = _build_client(tmp_path)
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.post(
                "/api/v1/ticket-imports/uploads",
                files={
                    "file": (
                        "jetstar.html",
                        JETSTAR_HTML.encode("utf-8"),
                        "text/html",
                    )
                },
            )
    finally:
        _cleanup(original_secret)

    assert response.status_code == 201
    payload = response.json()["data"]
    assert payload["source"] == "UPLOAD"
    assert "45,896,096 VND" not in payload["redacted_content"]
    assert "Giá vé: Vé Tiết kiệm" in payload["redacted_content"]

    with Session(engine) as session:
        ticket_import = session.exec(select(TicketImport)).one()
        assert ticket_import.source == TicketImportSource.UPLOAD
        assert ticket_import.created_by is not None


def test_upload_ticket_import_rejects_pdf_for_visual_preserving_flow(tmp_path):
    _engine, original_secret = _build_client(tmp_path)
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.post(
                "/api/v1/ticket-imports/uploads",
                files={
                    "file": (
                        "jetstar.pdf",
                        b"%PDF-1.4 fake itinerary",
                        "application/pdf",
                    )
                },
            )
    finally:
        _cleanup(original_secret)

    assert response.status_code == 415
    assert "application/pdf" in response.json()["detail"]


def test_inbound_email_rejects_invalid_secret(tmp_path):
    _engine, original_secret = _build_client(tmp_path, webhook_secret="expected-secret")
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.post(
                "/api/v1/ticket-imports/inbound-email",
                headers={"x-bay-buddy-inbound-secret": "wrong-secret"},
                json={"html": JETSTAR_HTML, "subject": "Jetstar SQD35Q"},
            )
    finally:
        _cleanup(original_secret)

    assert response.status_code == 401


def test_inbound_email_creates_idempotent_import(tmp_path):
    engine, original_secret = _build_client(tmp_path, webhook_secret="expected-secret")
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            first_response = client.post(
                "/api/v1/ticket-imports/inbound-email",
                headers={"x-bay-buddy-inbound-secret": "expected-secret"},
                json={
                    "html": JETSTAR_HTML,
                    "subject": "Jetstar SQD35Q",
                    "message_id": "message-1",
                    "from": "jetstar@example.com",
                },
            )
            second_response = client.post(
                "/api/v1/ticket-imports/inbound-email",
                headers={"x-bay-buddy-inbound-secret": "expected-secret"},
                json={
                    "html": JETSTAR_HTML,
                    "subject": "Jetstar SQD35Q",
                    "message_id": "message-1",
                    "from": "jetstar@example.com",
                },
            )
    finally:
        _cleanup(original_secret)

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    assert first_response.json()["data"]["id"] == second_response.json()["data"]["id"]

    with Session(engine) as session:
        assert len(session.exec(select(TicketImport)).all()) == 1
