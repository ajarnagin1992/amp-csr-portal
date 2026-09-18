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

> **Note:** the API runs on a free tier that sleeps after inactivity. The first
> request may take up to a minute to wake it; subsequent requests are fast.

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

Guardrails worth noting: a vehicle can't hold two active subscriptions, a
subscription can't transfer to a vehicle owned by a different customer, and
disabled plans can't be subscribed to. Each is enforced in the API, not just
the UI.

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
| `GET` | `/plans` | |
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
