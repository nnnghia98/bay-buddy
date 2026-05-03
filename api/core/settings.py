"""
core/settings.py - Centralized environment-backed runtime settings.
"""

import os


class Settings:
    """Application settings loaded from environment variables."""

    def __init__(self) -> None:
        self.gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")


settings = Settings()

