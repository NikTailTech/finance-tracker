# Finance Tracker

Personal finance app for EUR / CHF checking accounts and cash, with Needs · Play · Investment · Savings envelopes.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn-style UI · PostgreSQL · Prisma

Designed for local Docker Compose and Kubernetes (persistent Postgres, health checks, standalone Next.js output).

## Features

- **Dashboard** — net worth (FX-aware), balances per account/division, income/expenses, category chart, recent activity
- **Expenses / Income** — title, date, amount, account + division, extensible category; currency from account
- **Change** — account transfers, division transfers, EUR↔CHF conversions (never counted as income/expense)
- **Accounts** — live balances computed from the ledger (no duplicated stored totals)

## Quick start (local)

### 1. Start PostgreSQL

```bash
docker compose up -d db
```

Or use any Postgres 16 instance and set `DATABASE_URL`.

### 2. Configure env

```bash
cp .env.example .env
```

### 3. Migrate & seed

```bash
npm install
npm run db:migrate
npm run db:seed
```

Seed creates:

- Conto EUR, Conto CHF, Cash
- 4 divisions each (Needs, Play, Investment, Savings)
- Default expense/income categories
- Settings row (EUR→CHF rate)

### 4. Dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → redirects to `/dashboard`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js development server |
| `npm run build` | Production build (`output: "standalone"`) |
| `npm run start` | Start production server |
| `npm run db:generate` | Prisma client generate |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:deploy` | `prisma migrate deploy` (production) |
| `npm run db:seed` | Idempotent seed |
| `npm run db:studio` | Prisma Studio |

## Docker (full stack)

```bash
docker compose up --build
```

- App: `http://localhost:3000`
- Postgres volume: `finance_tracker_pg`
- Entrypoint runs `prisma migrate deploy` + seed, then `node server.js`

## Kubernetes

See `k8s/manifests.yaml`:

- Namespace, Secret, ConfigMap
- Postgres Deployment + PVC + Service
- App Deployment + Service + Ingress
- Readiness/liveness on `/api/health`

Update image name, host, and secrets before applying:

```bash
docker build -t finance-tracker:latest .
kubectl apply -f k8s/manifests.yaml
```

## Domain model

| Entity | Role |
|--------|------|
| `Account` | Conto EUR / Conto CHF / Cash (+ future accounts) |
| `AccountDivision` | Needs / Play / Investment / Savings |
| `Category` | Extensible EXPENSE / INCOME labels |
| `Transaction` | External expense or income (`Decimal(19,4)`) |
| `Transfer` | Internal ACCOUNT / DIVISION / CONVERSION |
| `Settings` | Display currency + EUR→CHF rate for net worth |

Balances = Σ income − Σ expenses − Σ transfer out + Σ transfer in per division.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Liveness/readiness |
| GET | `/api/dashboard` | Aggregated dashboard |
| GET | `/api/accounts` | Accounts + computed balances |
| GET/POST | `/api/categories` | List / create categories |
| GET/POST | `/api/transactions?type=` | List / create EXPENSE or INCOME |
| PATCH/DELETE | `/api/transactions/[id]` | Update / delete |
| GET/POST | `/api/transfers` | List / create changes |
| DELETE | `/api/transfers/[id]` | Delete change |
| GET/PATCH | `/api/settings` | FX / display currency |

## Future-ready

Schema and services leave room for budgets, recurring transactions, analytics, and extra accounts without rewriting the ledger core.
