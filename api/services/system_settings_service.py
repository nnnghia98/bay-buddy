from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlmodel import Session

from models.system_setting import SystemSetting, SystemSettingRead

GLOBAL_SETTINGS_ID = "global"


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None

    if value.tzinfo is None:
        return value

    return value.astimezone(timezone.utc).replace(tzinfo=None)


def get_or_create_system_setting(*, session: Session) -> SystemSetting:
    setting = session.get(SystemSetting, GLOBAL_SETTINGS_ID)
    if setting is not None:
        return setting

    setting = SystemSetting(id=GLOBAL_SETTINGS_ID)
    session.add(setting)
    session.flush()
    return setting


def get_system_setting_read(*, session: Session) -> SystemSettingRead:
    setting = get_or_create_system_setting(session=session)
    return SystemSettingRead.model_validate(setting)


def update_base_datetime(
    *,
    session: Session,
    base_datetime: datetime | None,
) -> SystemSettingRead:
    setting = get_or_create_system_setting(session=session)
    setting.base_datetime = _normalize_datetime(base_datetime)
    setting.updated_at = datetime.now(timezone.utc)
    session.add(setting)
    session.commit()
    session.refresh(setting)
    return SystemSettingRead.model_validate(setting)


def get_app_base_datetime(*, session: Session) -> datetime | None:
    setting = session.get(SystemSetting, GLOBAL_SETTINGS_ID)
    return setting.base_datetime if setting is not None else None


def apply_app_base_datetime(
    *,
    session: Session,
    statement: Any,
    column: Any,
) -> Any:
    base_datetime = get_app_base_datetime(session=session)
    if base_datetime is None:
        return statement

    return statement.where(column >= base_datetime)


def ensure_datetime_is_active(
    *,
    session: Session,
    value: datetime,
    detail: str = "Selected data is before the app base date time.",
) -> None:
    base_datetime = get_app_base_datetime(session=session)
    if base_datetime is None:
        return

    normalized_value = _normalize_datetime(value)
    if normalized_value is not None and normalized_value < base_datetime:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
        )
