# Bay Buddy Web Service

Standalone Next.js App Router frontend for Bay Buddy. This service is designed to run and deploy independently (Vercel target).

## Local development

```bash
yarn install
yarn dev --port 6769
```

Open `http://localhost:6769`.

## Build and test

```bash
yarn test
yarn lint
yarn build
```

## API contract generation

Generate typed API definitions from the API OpenAPI schema:

```bash
yarn generate:api-client
```

By default this reads from `http://localhost:6768/openapi.json`.
Override with `OPENAPI_SCHEMA_URL`.

## Shared governance

Project-wide architecture, business rules, and agent instructions remain in:

- `../docs/ARCHITECT.md`
- `../docs/BUSINESS.md`
- `../AGENTS.md`
- `../CLAUDE.md`
