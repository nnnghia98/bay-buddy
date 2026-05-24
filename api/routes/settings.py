from __future__ import annotations

from fastapi import APIRouter

from core.auth import CurrentUserDep, require_user_roles
from core.responses import success_response
from database import SessionDep
from models.enums import UserRole
from models.system_setting import SystemSettingUpdate
from services.system_settings_service import (
    get_system_setting_read,
    update_base_datetime,
)

router = APIRouter()


@router.get("/base-date-time", response_model=dict)
async def get_base_date_time_settings(
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Return the current app-wide base date time setting."""
    del current_user
    setting = get_system_setting_read(session=session)
    return success_response(setting.model_dump(mode="json"))


@router.patch("/base-date-time", response_model=dict)
async def update_base_date_time_settings(
    payload: SystemSettingUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Update the app-wide base date time setting. Admin only."""
    require_user_roles(current_user, UserRole.ADMIN)
    setting = update_base_datetime(
        session=session,
        base_datetime=payload.base_datetime,
    )
    return success_response(setting.model_dump(mode="json"))
