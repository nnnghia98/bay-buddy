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

Production deployments run the same command automatically as Railway's
pre-deploy command through `scripts/production_migrate.py`. The wrapper refuses
to run without a PostgreSQL `DATABASE_URL`, checks migration safety, and then
applies pending revisions. Railway must use `/api` as the service root
directory and `/api/railway.json` as the Config as Code file. The command runs
before the new API version starts; a failed migration stops that deployment.

Migration safety rules:

- `upgrade()` must not delete rows or drop tables/columns.
- Existing data backfills must be explicit and reviewed.
- Do not run `downgrade`, `stamp`, or `stamp --purge` in production.
- Test migrations against PostgreSQL before merging.
- Take a production backup before a migration that changes or removes data.

Run the local safety check with:

```bash
poetry run python scripts/check_migration_safety.py
```

The guarded production command can be tested only with a PostgreSQL database:

```bash
poetry run python scripts/production_migrate.py
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
