import pytest
from fastapi.testclient import TestClient
from google.genai.errors import ServerError

from main import app
from services.ai_agent import (
    AIExtractionValidationError,
    AIServiceTemporarilyUnavailable,
    parse_flight_content,
)
import routes.ai as ai_routes


def test_ai_parse_returns_retryable_503_when_gemini_is_overloaded(monkeypatch):
    async def overloaded_parser(*args, **kwargs):
        raise AIServiceTemporarilyUnavailable(
            "Gemini is temporarily overloaded. Please try again."
        )

    monkeypatch.setattr(ai_routes, "parse_flight_content", overloaded_parser)

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.post(
            "/api/v1/ai/parse",
            files={
                "file": (
                    "ticket.png",
                    b"fake image bytes",
                    "image/png",
                )
            },
        )

    assert response.status_code == 503
    assert response.json() == {
        "detail": "Gemini đang quá tải tạm thời. Vui lòng thử lại sau ít phút."
    }


def test_ai_parse_returns_422_when_required_fields_are_missing(monkeypatch):
    async def incomplete_parser(*args, **kwargs):
        raise AIExtractionValidationError(
            "AI response missing required fields: ['pnr', 'flight_date']. "
            "The uploaded document may not show those fields clearly enough."
        )

    monkeypatch.setattr(ai_routes, "parse_flight_content", incomplete_parser)

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.post(
            "/api/v1/ai/parse",
            files={
                "file": (
                    "ticket.png",
                    b"fake image bytes",
                    "image/png",
                )
            },
        )

    assert response.status_code == 422
    assert response.json() == {
        "detail": (
            "AI response missing required fields: ['pnr', 'flight_date']. "
            "The uploaded document may not show those fields clearly enough."
        )
    }


def test_parse_flight_content_retries_temporary_gemini_unavailable(monkeypatch):
    attempts = 0
    model_names: list[str] = []

    class FakeResponse:
        text = """
        {
          "pnr": "ABC123",
          "airline": "VJ",
          "ticket_number": "7382319992101",
          "passengers": ["NGUYEN VAN A"],
          "departure_place": "Ha Noi",
          "arrival_place": "Ho Chi Minh City",
          "departure_code": "HAN",
          "arrival_code": "SGN",
          "itinerary": "HAN-SGN",
          "flight_date": "2026-04-23T08:00:00",
          "net_price": 1500000,
          "currency": "VND"
        }
        """

    class FakeModels:
        def generate_content(self, *, model, contents):
            nonlocal attempts
            attempts += 1
            model_names.append(model)

            if attempts == 1:
                raise ServerError(
                    503,
                    {
                        "error": {
                            "code": 503,
                            "message": "This model is currently experiencing high demand.",
                            "status": "UNAVAILABLE",
                        }
                    },
                )

            return FakeResponse()

    class FakeClient:
        models = FakeModels()

    async def no_sleep(_delay):
        return None

    monkeypatch.setattr("services.ai_agent._get_genai_client", lambda: FakeClient())
    monkeypatch.setattr("services.ai_agent.asyncio.sleep", no_sleep)

    import asyncio

    parsed = asyncio.run(parse_flight_content(b"fake image bytes", "image/png"))

    assert parsed["pnr"] == "ABC123"
    assert parsed["ticket_number"] == "7382319992101"
    assert parsed["departure_code"] == "HAN"
    assert parsed["arrival_code"] == "SGN"
    assert attempts == 2
    assert model_names == ["gemini-3.1-flash-lite", "gemini-3.1-flash-lite"]


def test_parse_flight_content_rejects_null_required_fields(monkeypatch):
    class FakeResponse:
        text = """
        {
          "pnr": null,
          "airline": "VU",
          "ticket_number": "7382321386042, 7382321386041",
          "passengers": ["VU XUAN GIAO", "TRINH BA LONG"],
          "departure_place": "Da Nang",
          "arrival_place": "Hanoi",
          "departure_code": "DAD",
          "arrival_code": "HAN",
          "itinerary": "DAD-HAN",
          "flight_date": null,
          "net_price": 3772000,
          "currency": "VND"
        }
        """

    class FakeModels:
        def generate_content(self, *, model, contents):
            return FakeResponse()

    class FakeClient:
        models = FakeModels()

    monkeypatch.setattr("services.ai_agent._get_genai_client", lambda: FakeClient())

    import asyncio

    with pytest.raises(AIExtractionValidationError) as error:
        asyncio.run(parse_flight_content(b"fake image bytes", "image/png"))

    assert "pnr" in str(error.value)
    assert "flight_date" in str(error.value)
