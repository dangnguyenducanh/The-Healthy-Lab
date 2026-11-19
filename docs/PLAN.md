# The Healthy Lab: rebuild plan

Status: in progress on branch `redesign/nextjs-monorepo` (started 2026-11-19).
Decisions taken with the owner: Next.js rewrite of every page (public site and staff dashboards),
FastAPI on Vercel with Supabase Postgres, real JWT auth with security hardening, Vercel preview
deploy first, old `frontend/` and `tools/` removed (git history keeps them).

## 1. Directory tree

```
.
├── apps/
│   ├── web/                          Next.js 15 · App Router · TypeScript · React 19
│   │   ├── app/
│   │   │   ├── (site)/               public site: fixed nav + footer.closing
│   │   │   │   ├── page.tsx                  /                 home (place page)
│   │   │   │   ├── menu/                     /menu             full menu from the API, add to cart
│   │   │   │   ├── food-lab/[kind]/          /food-lab/bowl|wrap|salad|smoothie|juice
│   │   │   │   ├── cart/                     /cart             cart and checkout
│   │   │   │   ├── orders/                   /orders           my order history (signed in)
│   │   │   │   ├── reservations/             /reservations     book a table, virtual queue
│   │   │   │   ├── journal/ + [slug]/        /journal          articles (static content)
│   │   │   │   └── privacy/, terms/
│   │   │   ├── (auth)/login, register/       sign in, create account
│   │   │   ├── dashboard/                    staff app: role-guarded layout + sidebar
│   │   │   │   ├── admin/  kitchen/  cashier/  delivery/  staff/
│   │   │   ├── layout.tsx  globals.css  not-found.tsx
│   │   ├── components/  site/  dashboard/  ui/
│   │   ├── lib/          api.ts (fetch + refresh)  auth.tsx  cart.tsx  site.ts (facts)  journal.ts
│   │   ├── styles/kit/   design system CSS (tasteskill system, layout, motion, cards)
│   │   ├── public/images/
│   │   ├── middleware.ts             redirects signed-out visitors away from /dashboard and /orders
│   │   └── next.config.ts            /api rewrite, security headers, image config
│   └── api/                          FastAPI · SQLAlchemy 2 · Postgres (SQLite locally)
│       ├── main.py                   app + middleware; Vercel's FastAPI entrypoint (`app`)
│       ├── config.py                 settings from env, fails fast in production
│       ├── database.py  models.py  schemas.py  pagination.py
│       ├── auth.py                   JWT, cookies, password hashing, role guards
│       ├── routers/  services/
│       ├── scripts/seed.py
│       ├── tests/
│       └── requirements.txt  .python-version
├── docs/PLAN.md                      this file
├── docker-compose.yml                local: postgres + api + web
├── .github/workflows/ci.yml          pytest, lint, typecheck, build
└── README.md
```

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Web | Next.js 15 App Router, TypeScript, React 19 | Vercel-native, server components for content pages, client components for cart, builder, dashboards |
| Styling | The tasteskill design system (`styles/kit`) as global CSS + page CSS modules | one token set, grid, type and button system across site and dashboards; no CSS framework |
| Fonts | `next/font/google`: Source Serif 4 (display) + Libre Franklin (text) | self-hosted at build, no layout shift, CSP keeps `font-src 'self'` |
| Images | `next/image` | the 45 MB of PNGs are resized and served as AVIF/WebP per width |
| API | FastAPI 0.115, Pydantic v2, SQLAlchemy 2 | the existing, tested backend, kept and hardened |
| DB | Supabase Postgres 17 (transaction pooler, psycopg 3, NullPool) | serverless functions open short connections; the pooler keeps them cheap |
| Auth | PyJWT (HS256) access + refresh tokens in httpOnly cookies, bcrypt | see section 4 |
| Hosting | Vercel: project `healthy-lab-web` (root `apps/web`), project `healthy-lab-api` (root `apps/api`) | the web proxies `/api/*` to the API, so the browser sees one origin |
| Local | docker compose (postgres, api, web) or `npm run dev` + `uvicorn` with SQLite | |
| CI | GitHub Actions | pytest, ruff, `tsc --noEmit`, `next lint`, `next build` |

## 3. API

Base path: the browser calls `/api/...` on the web origin; the web rewrites it to the API project.
All bodies JSON. Lists take `?page=&page_size=` (see `pagination.py`).

| Area | Endpoints | Who |
|---|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | public / signed in |
| Catalogue | `GET /products`, `GET /products/{id}`; `POST`, `PUT /products/{id}` | public / admin |
| Food Lab | `GET /food-lab/options`, `POST /food-lab/preview` | public |
| Orders | `POST /orders`, `GET /orders/my`, `GET /orders/{id}`; `GET /orders`, `PUT /orders/{id}/status` | customer / staff |
| Payments | `POST /payments`, `GET /payments`, `PUT /payments/{id}/status` | customer / cashier, admin |
| Dining room | `GET, POST /tables`; `GET, POST /reservations`, `PUT /reservations/{id}/status`, `POST /reservations/{id}/complete`; `GET, POST /queue`, `POST /queue/next/call`, `PUT /queue/{id}/status`, `POST /queue/{id}/seat` | customer / staff |
| Inventory | `GET, POST /ingredients`, `/suppliers`, `/recipes`, `/inventory/lots`; `GET /inventory` | kitchen, admin |
| People | `GET /users`, `GET, POST /staff`, `GET /vouchers`, `GET /memberships/me`, `GET /admin/summary` | admin / signed in |
| Notifications | `GET /notifications` | signed in |
| Health | `GET /health` | public |

Roles: `customer`, `staff`, `chef`, `cashier`, `delivery`, `admin`; every staff route checks its
roles on the server, the dashboards only hide what the API would refuse anyway.

Later, not in this pass: Alembic migrations (the schema is created once by `scripts/seed.py`), a
real payment provider (payments are recorded, not charged), e-mail verification and password reset
(need a mail provider).

## 4. Security and JWT auth

**Tokens**
- Access token: JWT HS256, 15 minutes; claims `sub` (user id), `role`, `type: "access"`, `iat`,
  `exp`, `jti`, `iss: "healthy-lab-api"`, `aud: "healthy-lab-web"`. Verified with a fixed algorithm
  list, required claims, issuer and audience.
- Refresh token: JWT, 7 days, `type: "refresh"`; its `jti` is stored hashed in `refresh_tokens`
  with `expires_at`, `revoked_at`. `POST /auth/refresh` rotates it (old one revoked, new one
  issued). A revoked refresh token used again revokes every session of that user (theft signal).
- Secret `JWT_SECRET` (32+ random bytes) from Vercel env; the API refuses to start in production
  without it. Rotating the secret signs everyone out.

**Where the tokens live**
- Both in cookies set by the API: `HttpOnly; Secure; SameSite=Lax`; access `Path=/`, refresh
  `Path=/api/auth`. JavaScript never sees a token, so an XSS cannot steal one. No localStorage.
- `Authorization: Bearer` is still accepted for scripts and tests.

**CSRF**: cookies are `SameSite=Lax`, and every state-changing request authenticated by cookie
must carry `X-Requested-With: fetch` (a header a cross-site form cannot send, and CORS refuses to
let another origin add it).

**Passwords**: bcrypt (cost 12), 8 to 72 bytes; login answers "Invalid email or password" for both
an unknown email and a wrong password, and hashes a dummy password for unknown emails so timing
does not tell them apart.

**Brute force**: failed logins are counted per email in Postgres (`login_attempts`); 5 failures in
15 minutes lock that email for 15 minutes (429 with `Retry-After`). Works across serverless
instances, unlike an in-memory limiter.

**Authorisation**: `require_roles(...)` dependency on every staff route; the user row is loaded on
every request, so a disabled account or a changed role takes effect at once, not at token expiry.
Customers can read only their own orders, payments and reservations (checked in the query).

**Transport and headers** (web, `next.config.ts`): HSTS, `Content-Security-Policy`
(`default-src 'self'`; images self, data and blob; `frame-ancestors 'none'`), `X-Content-Type-Options:
nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` with camera,
microphone and geolocation off. API: the same basic headers, `/docs` off in production, CORS
limited to `ALLOWED_ORIGINS` (the proxy makes browser calls same-origin anyway).

**Database**: the API logs in as its own role `thl_api` that owns schema `healthy_lab`. That
schema is not exposed by Supabase's Data API, and row level security is on for every table with no
policies, so the public anon key can read nothing. No service-role key is used anywhere.

**Input**: Pydantic models with lengths and ranges on every request body; SQLAlchemy parameters
only, no string-built SQL; totals and prices recomputed on the server, never trusted from the
cart.

**Secrets**: only in Vercel env and a git-ignored `.env`; `.env.example` lists the names.

## 5. Design (tasteskill)

Kind: **place** (a restaurant people visit and order from). Photographs, flat colour, type and the
hover layer; no effects, gradients or scroll motion.

Deal: nav-cards · footer-visit · surface-pairs · buttons block · mark arc · offer composition strip
· place composition story (not used: over six screens) · type moment address · rooms layout (not
used: no rooms). Palette from the brand: ground `#F7F3EC`, surface `#EDE6DA`, ink `#2A2622`, muted
`#665E55`, accent leaf green `#1F6B3F`. Type: Source Serif 4 / Libre Franklin, display 400.

Home, in screens (1440x900):
1. `hero` (place hero): table of bowls photograph; h1 "Healthy kitchen on Williamson Plaza"; the
   hours line; button "Order online".
2. `visit`: h2 "Find us", the address set large, open-now line, hours, a room photograph.
3. `menu`: "Menu and prices", three groups of rows (bowls, wraps and salads, juices and
   smoothies) and a strip of four dish details.
4. `food-lab`: "Build your own bowl", three kinds with photographs (bowl, wrap, smoothie).
5. `booking`: "Book a table", photograph and the booking form.
6. `footer.closing`: close-photo, then the footer-visit directory.

Dashboards use the same tokens, type, buttons and hairlines in an app layout (sidebar, tables,
status controls); the one-section-per-screen rules apply to the marketing pages only.

Facts assumed (no real ones given): address "Williamson Plaza, Maggieberg" (street and district),
hours Monday to Friday 08:00 to 22:00, Saturday 10:00 to 16:00, Sunday closed; no phone; e-mail
button to `hello@thehealthylab.example`; prices from the current menu.

## 6. Deploy

1. Supabase project `the-healthy-lab` (ap-southeast-1): role `thl_api`, schema `healthy_lab`, RLS
   on; tables and demo data from `scripts/seed.py` run against the pooler.
2. Vercel project `healthy-lab-api` (root `apps/api`): env `DATABASE_URL`, `JWT_SECRET`,
   `ALLOWED_ORIGINS`, `ENV=production`. Deployed to its production URL so preview builds of the web
   have a fixed backend (it serves JSON only).
3. Vercel project `healthy-lab-web` (root `apps/web`): env `API_ORIGIN`; deployed as a **preview**.
   Promote with `vercel promote <url>` after review.
4. GitHub: branch `redesign/nextjs-monorepo`, PR into `main`.
