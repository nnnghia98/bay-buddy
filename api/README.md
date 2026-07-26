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

## Internal access login

The browser login accepts only a passcode and does not request or verify a
username. It matches the passcode against active users' bcrypt hashes in the
`user` table. Passcodes must be unique so one passcode resolves to one user for
JWT identity, RBAC, and audit ownership. Do not add passcodes or usernames to
`.env`.

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
