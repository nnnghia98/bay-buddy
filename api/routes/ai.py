"""
routes/ai.py – AI-powered parsing endpoints for Bay Buddy API.

Endpoints:
    POST /api/v1/ai/parse – Parse a flight confirmation file (image or PDF) into structured JSON.

Service reference: services/ai_agent.py
Schema reference:  docs/AGENT_PARSER.md
"""

from typing import Dict, Any

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from services.ai_agent import (
    AIServiceTemporarilyUnavailable,
    GEMINI_MODEL_NAME,
    parse_flight_content,
)


router = APIRouter()

# Allowed MIME types for file upload
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}


# ---------------------------------------------------------------------------
# Response Model
# ---------------------------------------------------------------------------

class ParseFlightResponse(BaseModel):
    """Response schema matching AGENT_PARSER.md output format."""

    pnr: str = Field(description="6-character PNR booking reference code.")
    airline: str = Field(description="Airline code: VNA, VJ, QH, or VU.")
    ticket_number: str = Field(description="Airline ticket number.")
    passengers: list[str] = Field(description="List of passenger names in UPPERCASE.")
    departure_place: str = Field(description="Readable departure place name.")
    arrival_place: str = Field(description="Readable arrival place name.")
    departure_code: str = Field(description="Departure place code, e.g. DAD.")
    arrival_code: str = Field(description="Arrival place code, e.g. SGN.")
    itinerary: str = Field(description="Flight route (e.g., 'HAN-SGN').")
    flight_date: str = Field(description="Departure datetime in ISO-8601 format.")
    net_price: float = Field(ge=0, description="Total net price from airline/supplier.")
    currency: str = Field(default="VND", description="Currency code, defaults to VND.")


# ---------------------------------------------------------------------------
# POST /api/v1/ai/parse
# ---------------------------------------------------------------------------

@router.post(
    "/parse",
    response_model=ParseFlightResponse,
    status_code=status.HTTP_200_OK,
    summary="Parse flight confirmation file",
    description=(
        "Extract structured flight data from an uploaded image or PDF using the configured Gemini model. "
        "Accepts multipart/form-data with a single 'file' field. "
        "Returns JSON matching the Ticket model schema suitable for database storage."
    ),
)
async def parse_flight(
    file: UploadFile = File(..., description="Image (JPEG/PNG/WebP) or PDF of a flight booking confirmation."),
) -> Dict[str, Any]:
    """
    Parse an uploaded flight confirmation file into structured JSON.

    Uses the configured Gemini model (multimodal) to extract:
    - PNR (booking reference)
    - Airline code
    - Passenger names
    - Itinerary
    - Flight date
    - Net price

    Args:
        file: Uploaded image or PDF file via multipart/form-data.

    Returns:
        ParseFlightResponse with extracted flight data.

    Raises:
        HTTPException 415: If the file type is not supported.
        HTTPException 500: If AI parsing fails or API key is not configured.
    """
    # Validate MIME type
    mime_type = file.content_type or "application/octet-stream"
    if mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Unsupported file type '{mime_type}'. "
                f"Allowed types: {', '.join(sorted(ALLOWED_MIME_TYPES))}"
            ),
        )

    try:
        # Read file bytes
        file_bytes = await file.read()

        # Call the AI service with multimodal input
        parsed_data = await parse_flight_content(file_bytes=file_bytes, mime_type=mime_type)

        return parsed_data

    except AIServiceTemporarilyUnavailable:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini đang quá tải tạm thời. Vui lòng thử lại sau ít phút.",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI parsing failed: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during parsing: {str(e)}",
        )


# ---------------------------------------------------------------------------
# Health check for AI service
# ---------------------------------------------------------------------------

@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Check AI service health",
    description="Verify that the AI service is properly configured.",
)
async def ai_health_check() -> Dict[str, str]:
    """
    Health check for AI service configuration.
    
    Returns:
        Status message indicating if AI service is ready.
    """
    import os
    
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service not configured: GEMINI_API_KEY is missing.",
        )
    
    return {
        "status": "ok",
        "service": "ai-parser",
        "model": GEMINI_MODEL_NAME,
    }
