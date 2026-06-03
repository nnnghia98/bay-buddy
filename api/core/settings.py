"""
core/settings.py - Centralized environment-backed runtime settings.
"""

import os


class Settings:
    """Application settings loaded from environment variables."""

    def __init__(self) -> None:
        self.gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
        self.ticket_import_max_upload_bytes: int = int(
            os.getenv("TICKET_IMPORT_MAX_UPLOAD_BYTES", str(10 * 1024 * 1024))
        )
        self.ticket_import_webhook_secret: str | None = os.getenv(
            "TICKET_IMPORT_WEBHOOK_SECRET"
        )


settings = Settings()
