"""
System-wide runtime settings for Bay Buddy.

The base_datetime marks the operational start of the active app window.
Rows before this datetime remain in the database for backup/history, but normal
application queries and mutations treat them as disabled legacy data.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class SystemSetting(SQLModel, table=True):
    """Singleton runtime settings row."""

    __tablename__ = "system_setting"

    id: str = Field(default="global", primary_key=True, max_length=50)
    base_datetime: Optional[datetime] = Field(
        default=None,
        description="Global operational start datetime. Null means all data is active.",
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp of the last settings update.",
    )


class SystemSettingRead(SQLModel):
    """Safe settings payload returned to the app."""

    base_datetime: Optional[datetime] = None
    updated_at: datetime


class SystemSettingUpdate(SQLModel):
    """Partial settings update payload."""

    base_datetime: Optional[datetime] = None
