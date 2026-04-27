"""
services/ai_agent.py – AI-powered flight data extraction using Google Gemini 2.5 Flash.

Supports multimodal input: images (JPEG, PNG, WebP) and PDF documents.
Extraction logic reference: docs/AGENT_PARSER.md
Model schema reference:     apps/api/models/ticket.py
"""

import asyncio
import json
import os
from typing import Any, Dict

from google import genai
from google.genai.errors import APIError
from google.genai import types


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

GEMINI_MODEL_NAME = "gemini-3.1-flash-lite"
GEMINI_MAX_ATTEMPTS = 3
GEMINI_RETRY_DELAYS_SECONDS = (1.0, 2.0)


class AIServiceTemporarilyUnavailable(RuntimeError):
    """Raised when Gemini is temporarily overloaded after retry attempts."""


def _get_genai_client() -> genai.Client:
    """
    Initialize the Gemini API client with credentials from environment.

    Expects GEMINI_API_KEY to be set in .env or environment variables.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY environment variable is not set. "
            "Please add it to your .env file."
        )
    return genai.Client(api_key=api_key)


# ---------------------------------------------------------------------------
# System Prompt
# ---------------------------------------------------------------------------

FLIGHT_EXTRACTION_PROMPT = """
You are an expert Flight Data Analyst for the Vietnam Aviation Market.

Your task is to extract structured data from flight booking confirmations submitted
as images (photos, screenshots) or PDF documents from Vietnam Airlines (VNA),
Vietjet Air (VJ), Bamboo Airways (QH), and Vietravel Airlines (VU).

## Extraction Requirements:
- **PNR**: 6-character alphanumeric code (booking reference).
- **Airline**: Map to one of [VNA, VJ, QH, VU]. Use airline name, logo, or branding to determine.
- **Ticket Number**: Extract the airline ticket number shown on the document.
- **Passengers**: List of full names in UPPERCASE format.
- **Departure Place**: Readable departure city/place name.
- **Arrival Place**: Readable arrival city/place name.
- **Departure Code**: Departure place code (e.g., HAN, DAD, SGN).
- **Arrival Code**: Arrival place code (e.g., HAN, DAD, SGN).
- **Itinerary**: Flight route derived from the place codes (e.g., "HAN-SGN").
- **Flight Date**: Convert to ISO-8601 format (YYYY-MM-DDTHH:MM:SS).
- **Net Price**: Extract the total price. If unclear or not mentioned, default to 0.
- **Currency**: Default to "VND" for Vietnamese market.

## Visual Parsing Instructions:
1. **Airline Logo Detection**: Scan the header for airline logos to identify the carrier.
   - VNA: Golden lotus flower on blue background.
   - VJ: Red "VietJet" wordmark, red-and-white color scheme.
   - QH: Green bamboo stalk logo.
   - VU: Teal/turquoise "Vietravel" brand mark.

2. **QR Code / Barcode**: Presence confirms a valid e-ticket. PNR is almost always adjacent.

3. **Price Table**: Look for labels "Tổng tiền", "Total Amount", "Giá vé", or "Fare".
   Extract the final total only. Currency formats: "2.500.000 VND" = "2,500,000 VND" = 2500000.

4. **Itinerary Layout**: Look for IATA airport codes in route segments (SGN → HAN).
   Map Vietnamese city names: Hà Nội→HAN, TP.HCM/Saigon→SGN, Đà Nẵng→DAD, Phú Quốc→PQC.

## Output Format:
Return ONLY a valid JSON object with this exact structure:
{
  "pnr": "string (6 characters)",
  "airline": "string (VNA|VJ|QH|VU)",
  "ticket_number": "string",
  "passengers": ["UPPERCASE FULLNAME 1", "UPPERCASE FULLNAME 2"],
  "departure_place": "string",
  "arrival_place": "string",
  "departure_code": "string",
  "arrival_code": "string",
  "itinerary": "string (route format)",
  "flight_date": "ISO-8601 datetime",
  "net_price": number,
  "currency": "VND"
}

Do not include any explanations, markdown formatting, or additional text.
Return ONLY the JSON object.
"""


# ---------------------------------------------------------------------------
# Parsing Function
# ---------------------------------------------------------------------------

async def parse_flight_content(file_bytes: bytes, mime_type: str) -> Dict[str, Any]:
    """
    Parse a flight confirmation file (image or PDF) into structured JSON.

    Uses Google Gemini 2.5 Flash with multimodal input to visually extract
    structured flight data from uploaded booking confirmation files.

    Args:
        file_bytes: Raw bytes of the uploaded file.
        mime_type:  MIME type of the file (e.g., "image/jpeg", "application/pdf").

    Returns:
        Dictionary with extracted flight data matching AGENT_PARSER.md schema:
        {
            "pnr": str,
            "airline": str,
            "ticket_number": str,
            "passengers": List[str],
            "departure_place": str,
            "arrival_place": str,
            "departure_code": str,
            "arrival_code": str,
            "itinerary": str,
            "flight_date": str (ISO-8601),
            "net_price": float,
            "currency": str
        }

    Raises:
        ValueError: If API key is not configured or parsing fails.
        json.JSONDecodeError: If the AI response is not valid JSON.
    """
    # Initialize the client
    client = _get_genai_client()

    # Build multimodal content parts: [file_data, text_prompt]
    contents = [
        types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
        types.Part.from_text(text=FLIGHT_EXTRACTION_PROMPT),
    ]

    response = None
    for attempt in range(GEMINI_MAX_ATTEMPTS):
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL_NAME,
                contents=contents,
            )
            break
        except APIError as error:
            if not _is_retryable_gemini_error(error):
                raise

            if attempt == GEMINI_MAX_ATTEMPTS - 1:
                raise AIServiceTemporarilyUnavailable(
                    "Gemini is temporarily overloaded. Please try again later."
                ) from error

            await asyncio.sleep(GEMINI_RETRY_DELAYS_SECONDS[attempt])

    if response is None:
        raise AIServiceTemporarilyUnavailable(
            "Gemini is temporarily unavailable. Please try again later."
        )

    # Extract the text from response
    response_text = response.text.strip()

    # Remove potential markdown code blocks if present
    if response_text.startswith("```json"):
        response_text = response_text.replace("```json", "").replace("```", "").strip()
    elif response_text.startswith("```"):
        response_text = response_text.replace("```", "").strip()

    # Parse JSON
    try:
        data = json.loads(response_text)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Failed to parse AI response as JSON. Response: {response_text[:200]}"
        ) from e

    # Validate required fields are present
    required_fields = [
        "pnr",
        "airline",
        "ticket_number",
        "passengers",
        "departure_place",
        "arrival_place",
        "departure_code",
        "arrival_code",
        "itinerary",
        "flight_date",
        "net_price",
    ]
    missing_fields = [field for field in required_fields if field not in data]

    if missing_fields:
        raise ValueError(
            f"AI response missing required fields: {missing_fields}. "
            f"Response: {response_text[:200]}"
        )

    # Ensure currency is set
    if "currency" not in data:
        data["currency"] = "VND"

    data["departure_code"] = str(data["departure_code"]).strip().upper()
    data["arrival_code"] = str(data["arrival_code"]).strip().upper()
    data["itinerary"] = f"{data['departure_code']}-{data['arrival_code']}"

    return data


def _is_retryable_gemini_error(error: APIError) -> bool:
    """Return True for temporary Gemini capacity/rate availability failures."""
    return error.code in {429, 500, 502, 503, 504} or error.status in {
        "RESOURCE_EXHAUSTED",
        "UNAVAILABLE",
    }
