# The Healthy Lab

A healthy-food restaurant site with online ordering, a build-your-own bowl builder, table
booking and staff dashboards. Next.js on the front, FastAPI on the back, Postgres on Supabase,
deployed on Vercel.

The full plan (directory tree, stack, API, security model, deploy) is in [docs/PLAN.md](docs/PLAN.md).

## Repository

```
apps/web   Next.js 16 (App Router, TypeScript): public site + staff dashboards
apps/api   FastAPI + SQLAlchemy: JSON API, JWT cookie auth
docs/      PLAN.md
.github/   CI: ruff + pytest, tsc + eslint + next build
```

## Run locally

**Without Docker** (SQLite, fastest):

```bash
cd apps/api && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
```

```bash
cd apps/api && .venv/bin/python seed.py && COOKIE_SECURE=false .venv/bin/uvicorn main:app --port 8000
```

```bash
cd apps/web && npm install && API_ORIGIN=http://127.0.0.1:8000 npm run dev
```

Open http://localhost:3000. Demo accounts (local seed only), all with password `password123`:
`customer@`, `admin@`, `chef@`, `cashier@`, `delivery@healthylab.test`.

**With Docker** (Postgres):

```bash
docker compose up --build -d
```

```bash
docker compose run --rm api python seed.py
```

## Test

```bash
cd apps/api && .venv/bin/ruff check . && .venv/bin/python -m pytest -q
```

```bash
cd apps/web && npx tsc --noEmit && npx eslint . && npm run build
```

## Security in short

- JWT access (15 min) and refresh (7 days) tokens in `HttpOnly; Secure; SameSite=Lax` cookies;
  refresh tokens are rotated and a reused one ends every session of that user.
- Writes need `X-Requested-With: fetch` (CSRF); logins lock for 15 minutes after 5 failures.
- Roles are checked by the API on every request; the dashboards only hide what it would refuse.
- Per-request nonce Content-Security-Policy, HSTS and the usual headers on the web; the API sends
  its own strict headers and hides `/docs` in production.
- The API logs in to Postgres as its own role in its own schema, with row level security on and
  nothing granted to Supabase's public keys.

Details: [docs/PLAN.md, section 4](docs/PLAN.md#4-security-and-jwt-auth).

## Deploy

Two Vercel projects from this repo: `healthy-lab-api` (root `apps/api`, env `DATABASE_URL`,
`JWT_SECRET`, `ENV=production`) and `healthy-lab-web` (root `apps/web`, env `API_ORIGIN` = the API
URL). See [docs/PLAN.md, section 6](docs/PLAN.md#6-deploy).
