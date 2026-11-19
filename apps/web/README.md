# The Healthy Lab: web

Next.js 16 app for the public site and the staff dashboards. Setup, checks and deploy: see the
[root README](../../README.md) and [docs/PLAN.md](../../docs/PLAN.md).

- `app/(site)`: public pages; `app/dashboard`: staff app; `proxy.ts`: CSP nonce and page gate
- `lib/api.ts`: the only way the browser talks to the API (`/api/*`, cookies, CSRF header)
- `styles/kit`: the design system (tasteskill); brand tokens in `app/globals.css`
