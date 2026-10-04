"""Transient identification extraction contract; not a database model."""
from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class IdentificationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    document_type: Literal["identity_card", "passport", "unknown"]
    document_number: str | None = Field(default=None, max_length=100)
    full_name: str | None = Field(default=None, max_length=300)
    last_name: str | None = Field(default=None, max_length=300)
    first_name: str | None = Field(default=None, max_length=300)
    date_of_birth: date | None = None
    sex: str | None = Field(default=None, max_length=100)
    nationality: str | None = Field(default=None, max_length=200)
    place_of_birth: str | None = Field(default=None, max_length=500)
    place_of_origin: str | None = Field(default=None, max_length=500)
    address: str | None = Field(default=None, max_length=1000)
    issue_date: date | None = None
    expiry_date: date | None = None
    issuing_authority: str | None = Field(default=None, max_length=500)
