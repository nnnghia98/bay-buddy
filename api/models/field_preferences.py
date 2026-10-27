from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field as ValidationField
from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


class FieldPreference(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str = ValidationField(default="", max_length=80)
    visible: bool = True
    required: bool = False
    min_length: int | None = ValidationField(default=None, ge=0, le=10000)
    max_length: int | None = ValidationField(default=None, ge=1, le=10000)
    minimum: float | None = ValidationField(default=None, allow_inf_nan=False)
    maximum: float | None = ValidationField(default=None, allow_inf_nan=False)


class FieldPreferencesUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field: str = ValidationField(max_length=150)
    preference: FieldPreference | None


class UserFieldPreferences(SQLModel, table=True):
    __tablename__ = "user_field_preferences"

    user_id: uuid.UUID = Field(foreign_key="user.id", primary_key=True)
    preferences: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
