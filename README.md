# AMP CSR Portal

An internal portal for AMP customer service representatives to look up car wash
members and resolve the calls they get: cancellations, billing questions,
moving a subscription to a new vehicle, and accounts blocked by a failed payment.

## Live

| Asset | URL |
|---|---|
| **Portal** | https://amp-csr-gateway.ajarnagin1992.workers.dev |
| **API** | https://amp-csr-api.onrender.com (not for direct use: requests that don't come through the portal get `401`, see [Deployment](#deployment)) |
| **Repo** | https://github.com/ajarnagin1992/amp-csr-portal |

### Note for the assessor: Render cold starts

The API is hosted on Render's free tier, which spins the service down after about
15 minutes without traffic. **The first request after an idle period can take up
to a minute** while the API boots. Until it does, the portal will show a loading
spinner (or an error, if the request times out), and reloading once the API is up
resolves it. Requests after that are fast.

This is a limitation of the free hosting tier I chose for this assessment, not of
the application: a paid Render instance (or any always-on host) doesn't sleep and
wouldn't have this delay. If the portal looks stuck on first load, please give it a
minute and refresh.

## What a CSR can do

| Requirement | Where |
|---|---|
| View a list of all users | `/` — paginated customer table |
| Quickly find a specific user | Search by name, email, phone, **or license plate** |
| View user details | `/users/:id` — account info, vehicle subscriptions, purchase history |
| Edit account information | Inline edit of first name, last name, email, phone |
| Add a vehicle subscription | Per-vehicle **Add Subscription**, with plan picker |
| Remove a subscription | Per-vehicle **End Subscription**, with confirmation |
| Transfer a subscription | Per-vehicle **Transfer**, targeting another vehicle on the account |
| Deactivate / reactivate an account | Account-level action, for "I want to cancel" |
| *Bonus:* Edit plans | `/plans` — create a plan, edit its name, description and price, enable or disable it |

Guardrails worth noting: a vehicle can't hold two active subscriptions, a
subscription can't transfer to a vehicle owned by a different customer, and
disabled plans can't be subscribed to. Each is enforced in the API, not just
the UI. Disabling a plan only closes it to new subscriptions; members already
on it keep it.

## Architecture

```
Cloudflare Worker  ──  serves the built React SPA
      │                proxies /api/* ──►  Render (NestJS)  ──►  Neon (Postgres)
      └─ same origin, so no CORS
```

- **apps/web** — React 19, Vite, Mantine + Tailwind, TanStack Query, React Router
- **apps/api** — NestJS, Prisma 7
- **apps/gateway** — Cloudflare Worker: static assets + `/api` reverse proxy
  that adds an `X-Gateway-Secret` header to every request it forwards
- **packages/shared** — Zod schemas shared by both sides; DTO types are inferred
  from them, so the client and server can't drift

The API is only reachable through the Worker. A global guard in the API
([`gateway-secret.guard.ts`](apps/api/src/common/guards/gateway-secret.guard.ts))
rejects any request without the matching secret, so the public onrender.com URL
can't be used to bypass the portal.

## Running locally

```bash
npm ci
cp apps/api/.env.example apps/api/.env   # point DATABASE_URL at your Postgres
npm --prefix apps/api run prisma:migrate
npm --prefix apps/api run prisma:seed    # ~45 customers, plus a CSR: csr@example.com
npm run dev                              # api :3000, web :5173
```

Locally the gateway check is off: with no `GATEWAY_SECRET` set, the API accepts
any request, since `npm run dev` proxies straight to it without going through the
Worker. To exercise the Worker path, set the same `GATEWAY_SECRET` in
`apps/api/.env` and in `apps/gateway/.dev.vars` (see `.dev.vars.example`).

The seed prints a random password for `csr@example.com` the first time it
creates it. To choose one (or reset it), run the seed with `SEED_CSR_PASSWORD`
set. Re-seeding never deletes CSR accounts.

```bash
npm test        # all workspaces
npm run lint
npm run typecheck
```

### End-to-end tests

Playwright drives the real portal in Chromium. `/api/*` is served by a stateful
in-memory fake ([`apps/web/e2e/support/fakeApi.ts`](apps/web/e2e/support/fakeApi.ts))
that enforces the API's business rules, so the suite needs no database and no
running API, and every test starts from the same seed data.

```bash
npx playwright install chromium          # once, from apps/web
npm run test:e2e -w @amp-csr/web         # headless
npm run test:e2e:ui -w @amp-csr/web      # Playwright's interactive UI
```

It uses its own dev server on port 5199 (override with `E2E_PORT`), so it won't
collide with `npm run dev`. It is not part of `npm test`; CI runs it as a
separate `e2e` job.

## Authentication

CSRs sign in with email and password. The API issues a random session token in
an `HttpOnly`, `SameSite=Strict` cookie (`Secure` in production) and stores only
its SHA-256 hash, so a database leak doesn't leak live sessions. Sessions last
8 hours, and signing out (or disabling the CSR) ends them server-side
immediately. Passwords are hashed with scrypt.

Every route requires a session except `POST /auth/login`, `POST /auth/logout`
and the health check. `SameSite=Strict` is the CSRF defense, which works because
the portal and API share one origin through the gateway. Failed logins are
limited to 5 per email per 15 minutes. That state is in memory, so it assumes a
single API instance and resets on restart.

Not built: roles (every active CSR can do everything), a UI for managing CSR
accounts, and an audit trail of which CSR changed what.

## API

Everything below except `/auth/login`, `/auth/logout` and `GET /` needs a
signed-in CSR; otherwise it returns `401`.

| Method | Route | |
|---|---|---|
| `POST` | `/auth/login` | `{ email, password }`; sets the session cookie |
| `POST` | `/auth/logout` | ends the session and clears the cookie |
| `GET` | `/auth/me` | the signed-in CSR |
| `GET` | `/users` | paginated; `?search=` matches name, email, phone, plate |
| `GET` | `/users/:id` | with vehicles, subscriptions, and purchases |
| `PATCH` | `/users/:id` | update account info |
| `DELETE` | `/users/:id` | deactivate |
| `POST` | `/users/:id/reactivate` | |
| `GET` | `/plans` | active plans; `?includeDisabled=true` for all |
| `POST` | `/plans` | create a plan |
| `PATCH` | `/plans/:id` | edit name, description, price, or status |
| `POST` | `/subscriptions` | |
| `DELETE` | `/subscriptions/:id` | cancel |
| `POST` | `/subscriptions/:id/transfer` | |

## Data model

See [ER-DIAGRAM.md](ER-DIAGRAM.md), which also documents a proposed revision to
how subscriptions relate to vehicles — modelling a subscription as a durable
customer↔plan agreement with vehicle coverage as a dated fact, so that a
transfer preserves billing history instead of splitting it across two rows.

## Deployment

- **API** — Render, via [`render.yaml`](render.yaml). Migrations run at build
  time; seeding is run by hand so deploys don't wipe data.
- **API access** — the API only accepts requests that carry the gateway's
  `X-Gateway-Secret` header (`GATEWAY_SECRET` on Render and on the Worker, which
  must match). Direct hits to the onrender.com URL get 401; only `GET /` (the
  health check) is public. To rotate: set the new value as `GATEWAY_SECRET` on
  Render with the old one as `GATEWAY_SECRET_PREVIOUS`, run
  `wrangler secret put GATEWAY_SECRET` in `apps/gateway`, then remove
  `GATEWAY_SECRET_PREVIOUS`.
- **Portal** — Cloudflare Workers, via
  [`.github/workflows/deploy-cloudflare.yml`](.github/workflows/deploy-cloudflare.yml),
  gated on CI passing.
