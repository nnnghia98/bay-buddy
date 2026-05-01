# Bay Buddy Workspace

This parent workspace coordinates two independent services:

- `api/` — FastAPI backend (Railway deployment target)
- `web/` — Next.js frontend (Vercel deployment target)

`docs/`, `AGENTS.md`, and `CLAUDE.md` remain centralized here as shared governance and domain standards.

## Local dev shortcuts

```bash
yarn api
yarn web
```

## Service boundaries

- Each service owns its own dependencies, env files, and deployment lifecycle.
- API/Web contract sync uses OpenAPI export from `api` and typed generation in `web`.
- Production rollouts are independent with phased cutover and rollback runbooks in `docs/`.
