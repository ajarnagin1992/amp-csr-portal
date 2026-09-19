# AMP CSR Portal

An internal portal for AMP customer service representatives to look up car wash
members and resolve the calls they get: cancellations, billing questions,
moving a subscription to a new vehicle, and accounts blocked by a failed payment.

## Live

| | |
|---|---|
| **Portal** | https://amp-csr-gateway.ajarnagin1992.workers.dev |
| **API** | https://amp-csr-api.onrender.com |
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
- **packages/shared** — Zod schemas shared by both sides; DTO types are inferred
  from them, so the client and server can't drift

## Running locally

```bash
npm ci
cp apps/api/.env.example apps/api/.env   # point DATABASE_URL at your Postgres
npm --prefix apps/api run prisma:migrate
npm --prefix apps/api run prisma:seed    # ~45 customers with vehicles and history
npm run dev                              # api :3000, web :5173
```

```bash
npm test        # all workspaces
npm run lint
npm run typecheck
```

## API

| Method | Route | |
|---|---|---|
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
- **Portal** — Cloudflare Workers, via
  [`.github/workflows/deploy-cloudflare.yml`](.github/workflows/deploy-cloudflare.yml),
  gated on CI passing.
