import pytest
from fastapi.testclient import TestClient
from google.genai.errors import ServerError

from main import app
from services.ai_agent import AIServiceTemporarilyUnavailable, parse_flight_content
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


def test_parse_flight_content_retries_temporary_gemini_unavailable(monkeypatch):
    attempts = 0
    model_names: list[str] = []

    class FakeResponse:
        text = """
        {
          "pnr": "ABC123",
          "airline": "VJ",
          "passengers": ["NGUYEN VAN A"],
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
    assert attempts == 2
    assert model_names == ["gemini-2.5-flash", "gemini-2.5-flash"]
