import json
import logging
from collections.abc import Mapping
from urllib.parse import urlparse


logger = logging.getLogger("uvicorn.error")


def build_runtime_environment_summary(env: Mapping[str, str | None]) -> dict:
    database_url = env.get("DATABASE_URL")

    frontend_url = [
        origin.strip()
        for origin in (env.get("FRONTEND_URL") or "").split(",")
        if origin.strip()
    ]

    summary = {
        "database": _summarize_database_url(database_url),
        "frontend_url": frontend_url,
        "secret_key_set": bool(env.get("SECRET_KEY")),
        "sql_echo": (env.get("SQL_ECHO") or "").lower() == "true",
        "gemini_api_key_set": bool(env.get("GEMINI_API_KEY")),
    }

    return summary


def log_runtime_environment_summary(env: Mapping[str, str | None]) -> None:
    summary = build_runtime_environment_summary(env)
    logger.info("Runtime environment summary: %s", json.dumps(summary, sort_keys=True))


def _summarize_database_url(database_url: str | None) -> dict:
    if not database_url:
        return {"configured": False}

    parsed = urlparse(database_url)
    database_name = parsed.path.lstrip("/") or None

    return {
        "configured": True,
        "driver": parsed.scheme or None,
        "host": parsed.hostname,
        "port": parsed.port,
        "database": database_name,
        "username": parsed.username,
        "password_set": parsed.password is not None,
    }
