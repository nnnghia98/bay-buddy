from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from sqlmodel import Session

from models import (
    Customer, CustomerRead, Invoice, InvoiceRead, InvoiceItem, InvoiceItemRead,
    Quote, QuoteRead, QuoteItem, QuoteItemRead, Ticket, TicketRead,
    Transaction, TransactionRead, User, UserRead,
    SystemSetting, SystemSettingRead, Workbook, WorkbookSession,
)
from schemas.workbook import WorkbookUploadResponse, WorkbookSessionSummary
from models.field_preferences import FieldPreferencesUpdate, UserFieldPreferences

PUBLIC_MODELS = (
    (Customer, CustomerRead), (Ticket, TicketRead), (Transaction, TransactionRead),
    (Invoice, InvoiceRead), (InvoiceItem, InvoiceItemRead), (Quote, QuoteRead),
    (QuoteItem, QuoteItemRead), (User, UserRead),
    (SystemSetting, SystemSettingRead), (Workbook, WorkbookUploadResponse),
    (WorkbookSession, WorkbookSessionSummary),
)


UI_FIELDS = {
    "customer": {
        "address", "balance", "email", "is_active",
        "name", "phone", "tax_code", "type",
    },
    "invoice": {
        "created_at", "customer_address_snapshot", "customer_name_snapshot", "customer_tax_code_snapshot",
        "discount_amount", "invoice_number", "issued_at", "note",
        "status", "tax_amount", "total_amount",
    },
    "invoice_item": {
        "description", "passenger_name_snapshot", "quantity", "total",
        "unit_price_snapshot",
    },
    "quote": {
        "created_at", "customer_address_snapshot", "customer_name_snapshot", "customer_tax_code_snapshot",
        "discount_amount", "note", "status", "tax_amount",
        "total_amount", "valid_until",
    },
    "quote_item": {
        "description", "passenger_name_snapshot", "quantity", "total",
        "unit_price_snapshot",
    },
    "system_setting": {
        "base_datetime",
    },
    "ticket": {
        "add_in_price", "airline", "arrival_code", "arrival_place",
        "ast_price", "booked_at", "created_at", "customer_id",
        "departure_code", "departure_place", "discount", "ev_price",
        "flight_date", "insurance_price", "itinerary", "net_price",
        "passengers", "pnr", "selling_price",
        "status", "thf_price", "ticket_number", "true_income",
        "updated_at", "web_price",
    },
    "transaction": {
        "amount", "category", "created_at", "evidence_url",
        "linked_ticket_id", "method", "note", "occurred_at",
        "type", "payment_occurred_at",
    },
    "user": {
        "is_active", "role", "username",
    },
    "workbook_editor_session": {
        "display_name", "selected_sheet_name", "updated_at",
    },
    "workbook_editor_workbook": {
        "original_filename", "sheet_count",
    },
}


def get_field_catalog() -> list[dict[str, Any]]:
    catalog = []
    for table, public in PUBLIC_MODELS:
        schema = public.model_json_schema()
        for name, spec in schema["properties"].items():
            if name not in table.__table__.columns or name not in UI_FIELDS.get(table.__tablename__, set()):
                continue
            variants = spec.get("anyOf", [spec])
            value = next((v for v in variants if v.get("type") != "null"), spec)
            if "$ref" in value:
                value = schema.get("$defs", {}).get(value["$ref"].split("/")[-1], value)
            catalog.append({
                "key": f"{table.__tablename__}.{name}",
                "table": table.__tablename__, "name": name,
                "type": value.get("format", value.get("type", "string")),
                "rules": {k: v for k, v in value.items() if k in (
                    "minLength", "maxLength", "minimum", "maximum",
                    "exclusiveMinimum", "exclusiveMaximum", "enum",
                )},
            })
    return catalog


def get_field_preferences(*, session: Session, user: User) -> dict[str, Any]:
    row = session.get(UserFieldPreferences, user.id)
    return {"catalog": get_field_catalog(), "preferences": row.preferences if row else {}}


def update_field_preference(
    *, session: Session, user: User, payload: FieldPreferencesUpdate,
) -> dict[str, Any]:
    field = next((f for f in get_field_catalog() if f["key"] == payload.field), None)
    if field is None:
        raise HTTPException(422, "Unknown UI field")
    preference = payload.preference
    if preference:
        if preference.required and not preference.visible:
            raise HTTPException(422, "Required fields must remain visible")
        for lower, upper in ((preference.min_length, preference.max_length),
                             (preference.minimum, preference.maximum)):
            if lower is not None and upper is not None and lower > upper:
                raise HTTPException(422, "Minimum must not exceed maximum")
        if field["type"] != "string" and (
            preference.min_length is not None or preference.max_length is not None
        ):
            raise HTTPException(422, "Length rules require a text field")
        if field["type"] not in ("number", "integer") and (
            preference.minimum is not None or preference.maximum is not None
        ):
            raise HTTPException(422, "Numeric rules require a number field")
        rules = field["rules"]
        for lower, upper, base_lower, base_upper in (
            (preference.min_length, preference.max_length, rules.get("minLength"), rules.get("maxLength")),
            (preference.minimum, preference.maximum, rules.get("minimum"), rules.get("maximum")),
        ):
            effective_lower = max(v for v in (lower, base_lower, float("-inf")) if v is not None)
            effective_upper = min(v for v in (upper, base_upper, float("inf")) if v is not None)
            if effective_lower > effective_upper:
                raise HTTPException(422, "Personal rules conflict with system validation")
        for key, baseline, tightening in (
            ("min_length", "minLength", 1), ("max_length", "maxLength", -1),
            ("minimum", "minimum", 1), ("maximum", "maximum", -1),
        ):
            value = getattr(preference, key)
            if value is not None and baseline in rules and (value - rules[baseline]) * tightening < 0:
                raise HTTPException(422, "Personal rules cannot weaken system validation")
    row = session.get(UserFieldPreferences, user.id)
    if row is None:
        row = UserFieldPreferences(user_id=user.id)
    preferences = dict(row.preferences)
    if preference is None:
        preferences.pop(payload.field, None)
    else:
        preferences[payload.field] = preference.model_dump()
    row.preferences = preferences
    session.add(row)
    session.commit()
    return get_field_preferences(session=session, user=user)
