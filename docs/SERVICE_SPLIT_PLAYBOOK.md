# Bay Buddy Service Split Playbook

Last updated: May 1, 2026

## Topology

- `api/` is a standalone backend service deployed to Railway.
- `web/` is a standalone frontend service deployed to Vercel.
- Parent workspace (`/bay-buddy`) keeps shared governance docs and coordination scripts only.

## Contract Versioning Handshake

1. API team exports and publishes OpenAPI schema (`api/openapi/openapi.json`) for each release tag.
2. Web team updates to the intended API contract version and runs `yarn generate:api-client`.
3. Web CI must pass compile/test/build using the generated types before deploy.
4. Any API breaking change requires a coordinated Web release window.

## Environment Ownership

- API-owned: `DATABASE_URL`, `SECRET_KEY`, `GEMINI_API_KEY`, `FRONTEND_URL`.
- Web-owned: `NEXT_PUBLIC_API_BASE_URL`, optional `INTERNAL_API_BASE_URL`, auth/session envs.
- Do not share a root `.env` as runtime source for both services in production.

## Phased Cutover

1. Deploy API staging on Railway and verify health + authenticated finance write flows.
2. Deploy Web staging on Vercel against staging API and verify RSC reads + Server Actions.
3. Promote API and Web independently to production after smoke checks.

## Rollback

- API rollback: redeploy previous Railway release and restore prior API env version.
- Web rollback: redeploy previous Vercel deployment alias.
- If contract mismatch occurs, roll back Web first, then API only if required.
