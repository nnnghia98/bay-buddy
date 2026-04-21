"""
Query Google Gemini models visible to the current API key and print the subset
that matches Google's published free-tier model families.

Why this file exists:
- `client.models.list()` tells us which model ids are currently exposed.
- Google's free-tier status is documented separately in the Gemini rate limits
  page rather than returned by the SDK as a first-class field.

Official references used for this script:
- Models list API: https://ai.google.dev/api/rest/generativelanguage/models/list
- Rate limits / Free tier docs: https://ai.google.dev/gemini-api/docs/rate-limits

Usage:
    poetry run python scripts/list_google_free_models.py
    poetry run python scripts/list_google_free_models.py --json
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any

from google import genai


# Free-tier model families observed in Google's official rate-limits docs
# on 2026-04-10. Update this list if Google changes the free-tier catalog.
FREE_TIER_MODEL_PREFIXES = (
    "gemini-3.1-pro-preview",
    "gemini-3.1-flash-preview",
    "gemini-3.1-flash-lite-preview",
    "gemini-3.1-flash-image-preview",
    "gemini-3-pro-image-preview",
    "gemini-2.5-pro",
    "gemini-2.5-pro-tts",
    "gemini-2.5-flash",
    "gemini-2.5-flash-preview",
    "gemini-2.5-flash-image-preview",
    "gemini-2.5-flash-tts",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash-lite-preview",
    "gemini-2.0-flash",
    "gemini-2.0-flash-image",
    "gemini-2.0-flash-lite",
    "gemini-embedding",
)


def _get_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Export it before running this script."
        )
    return genai.Client(api_key=api_key)


def _model_to_dict(model: Any) -> dict[str, Any]:
    if hasattr(model, "model_dump"):
        return model.model_dump()
    if isinstance(model, dict):
        return model
    return {
        key: value
        for key, value in vars(model).items()
        if not key.startswith("_")
    }


def _extract_name(model: dict[str, Any]) -> str:
    name = model.get("name") or model.get("model") or ""
    if not isinstance(name, str):
        return ""
    return name


def _canonical_model_id(name: str) -> str:
    return name.removeprefix("models/")


def _matches_free_tier(model_id: str) -> bool:
    return any(
        model_id == prefix or model_id.startswith(f"{prefix}-")
        for prefix in FREE_TIER_MODEL_PREFIXES
    )


def _extract_supported_actions(model: dict[str, Any]) -> list[str]:
    actions = model.get("supported_actions")
    if isinstance(actions, list):
        return [str(action) for action in actions]

    methods = model.get("supported_generation_methods")
    if isinstance(methods, list):
        return [str(method) for method in methods]

    return []


def _collect_free_models() -> list[dict[str, Any]]:
    client = _get_client()

    try:
        free_models: list[dict[str, Any]] = []

        for raw_model in client.models.list(config={"page_size": 100}):
            model = _model_to_dict(raw_model)
            raw_name = _extract_name(model)
            model_id = _canonical_model_id(raw_name)

            if not model_id or not _matches_free_tier(model_id):
                continue

            free_models.append(
                {
                    "name": raw_name,
                    "model_id": model_id,
                    "display_name": model.get("display_name"),
                    "description": model.get("description"),
                    "input_token_limit": model.get("input_token_limit"),
                    "output_token_limit": model.get("output_token_limit"),
                    "supported_actions": _extract_supported_actions(model),
                }
            )

        free_models.sort(key=lambda item: item["model_id"])
        return free_models
    finally:
        client.close()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="List Gemini models that currently match Google's free-tier families."
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print the result as JSON.",
    )
    args = parser.parse_args()

    try:
        free_models = _collect_free_models()
    except Exception as exc:  # pragma: no cover - network/API failure path
        print(f"Failed to query Gemini models: {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(free_models, indent=2, ensure_ascii=False))
        return 0

    if not free_models:
        print("No free-tier Gemini models were returned for the current API key.")
        print(
            "Check GEMINI_API_KEY, project region/access, and Google's current free-tier docs."
        )
        return 0

    print("Free-tier Gemini models visible to the current API key:\n")
    for model in free_models:
        actions = ", ".join(model["supported_actions"]) or "unknown"
        print(f"- {model['model_id']}")
        print(f"  name: {model['name']}")
        if model["display_name"]:
            print(f"  display_name: {model['display_name']}")
        if model["input_token_limit"] is not None:
            print(f"  input_token_limit: {model['input_token_limit']}")
        if model["output_token_limit"] is not None:
            print(f"  output_token_limit: {model['output_token_limit']}")
        print(f"  supported_actions: {actions}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
