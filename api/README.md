# Bay Buddy API Service

Standalone FastAPI service for Bay Buddy. This service is designed to run and deploy independently (Railway target).

## Local development

```bash
poetry install
poetry run uvicorn main:app --reload --port 6768
```

## Database migrations

```bash
poetry run alembic upgrade head
```

## OpenAPI contract publishing

Export the schema artifact used by the Web service contract pipeline:

```bash
poetry run python scripts/export_openapi.py
```

The exported file is written to `openapi/openapi.json`.

## Shared governance

Project-wide architecture, business rules, and agent instructions remain in:

- `../docs/ARCHITECT.md`
- `../docs/BUSINESS.md`
- `../AGENTS.md`
- `../CLAUDE.md`
