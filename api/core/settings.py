"""
core/settings.py - Centralized environment-backed runtime settings.
"""

import os


def _positive_int_setting(name: str, default: int) -> int:
    """Read a required-positive integer setting."""

    value = int(os.getenv(name, str(default)))
    if value <= 0:
        raise ValueError(f"{name} must be greater than zero.")
    return value


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
        self.workbook_storage_root: str = os.getenv(
            "WORKBOOK_STORAGE_ROOT", "storage/workbooks"
        )
        self.workbook_max_upload_bytes: int = _positive_int_setting(
            "WORKBOOK_MAX_UPLOAD_BYTES", 20 * 1024 * 1024
        )
        self.workbook_max_rows: int = _positive_int_setting(
            "WORKBOOK_MAX_ROWS", 20_000
        )
        self.workbook_max_columns: int = _positive_int_setting(
            "WORKBOOK_MAX_COLUMNS", 100
        )
        self.workbook_max_page_size: int = _positive_int_setting(
            "WORKBOOK_MAX_PAGE_SIZE", 200
        )


settings = Settings()
