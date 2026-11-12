# Finance Tracker

Self-hosted personal finance app for checking accounts and cash, with **Needs · Play · Investment · Savings** envelopes and first-class **EUR / CHF** support.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · PostgreSQL · Prisma

Designed for local Docker Compose and optional Kubernetes (persistent Postgres, health checks, standalone Next.js output).

> **Not financial, tax, or legal advice.** This app helps you track your own money; verify figures before making decisions.

## Why it exists

This app was built for an **Italian–Swiss** personal setup: typically **two checking accounts in different currencies** (EUR and CHF), plus optional cash, with money moving between envelopes and currencies every month.

That dual-currency “two accounts” story is the **original use case**, not a hard limit.

Everything is meant to be **yours to customize**:

- Add as many accounts as you need (banks, cash, extra wallets)
- Choose EUR or CHF per account
- Create your own categories, templates, and debts
- Tune FX rate, theme, date format, and navigation in Settings

Nothing important is locked to the author’s ledger. The app ships with an **empty** accounts/categories setup on purpose — you shape it. Making it public only makes sense if others can bend it to their own life.

## Features

- **Dashboard** — FX-aware net worth, balances per account/division, income/expenses, category chart, recent activity
- **Expenses / Income** — title, date, amount, account + division, category; currency comes from the account
- **Review** — browse and edit past expenses and income
- **Change** — account transfers, division transfers, EUR↔CHF conversions (never counted as income/expense)
- **Debts** — track money owed to you / by you, settle into the ledger
- **Accounts** — live balances computed from the ledger (no duplicated stored totals)
- **Categories** — your own expense and income labels (nothing preloaded)
- **Templates** — quick presets for recurring expenses/income
- **Settings** — display currency, EUR→CHF rate, date format, theme / accent, nav order

## Privacy and security

- Built for **local / self-hosted** use. There is no multi-user auth layer.
- All data lives in **your** PostgreSQL database.
- Do not expose the app to the public internet without adding authentication and hardening.
- Keep `.env` private. Only `.env.example` is committed.

## Quick start (local)

### Requirements

- Node.js 20+ (22 recommended)
- npm
- Docker (recommended) or another PostgreSQL 16 instance

### 1. Start PostgreSQL

```bash
docker compose up -d db
```

If port `5432` is already in use:

```bash
POSTGRES_PORT=5433 docker compose up -d db
```

Then point `DATABASE_URL` at `localhost:5433`.

### 2. Configure env

```bash
cp .env.example .env
```

Default local URL:

```env
DATABASE_URL="postgresql://money:money@localhost:5432/finance_tracker?schema=public"
```

### 3. Install, migrate, seed

```bash
npm install
npm run db:deploy
npm run db:seed
```

For local schema iteration you can use `npm run db:migrate` instead of `db:deploy`.

**Seed creates only** the Settings row (display currency + EUR→CHF rate).

**Accounts and categories start empty** — you create them yourself as the first setup steps.

### 4. Dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → redirects to `/dashboard`.

## End-user mini guide

Use this flow the first time you open the app. Treat the steps as a starting recipe — rename, add, or skip pieces to match how you actually bank.

### Step 1 — Create accounts

Go to **Accounts** and add every place your money lives.

A common Italian–Swiss starting point is **two checking accounts** (one **EUR**, one **CHF**), optionally plus cash. You can add more accounts later, or use a completely different mix — the app does not force a fixed chart of accounts.

For each account choose:

- **Name** (your bank nickname, e.g. PostFinance, Intesa, Cash wallet)
- **Currency** (`EUR` or `CHF`) — fixed at creation
- **Type** — Checking / bank or Cash

Each account automatically gets four envelopes: **Needs**, **Play**, **Investment**, **Savings**.

### Step 2 — Create categories

Go to **Categories** and add the labels you actually use.

Examples:

- Expenses: Groceries, Rent, Transport, Health
- Income: Salary, Freelance, Refund

Nothing is preloaded on purpose — keep the list short and personal.

### Step 3 — Record money in and out

- **Income** — money entering an account + envelope + category
- **Expenses** — money leaving an account + envelope + category

Currency is always taken from the selected account.

### Step 4 — Move money without changing net worth

Use **Change** for internal movements:

| Kind | Use when |
| --- | --- |
| Account transfer | Same currency, different accounts |
| Division transfer | Same account, different envelope |
| Conversion | EUR ↔ CHF (set the exchange rate) |

These never appear as income or expense.

### Step 5 — Optional daily helpers

- **Templates** — save recurring rows (salary, fuel, …) and apply them quickly
- **Debts** — track IOUs; settling creates the matching income/expense
- **Review** — filter and edit past transactions
- **Settings** — EUR→CHF rate for net worth, preferred date format, theme, nav order

### Step 6 — Read the dashboard

**Dashboard** shows:

- Totals by currency
- Account / envelope balances
- Income vs expenses for the selected period
- Category breakdown
- Optional investment allocation cards (if configured)

Tip: update the EUR→CHF rate in **Settings** so CHF and EUR totals convert consistently.

## Pages

| Route | Purpose |
| --- | --- |
| `/dashboard` | Overview and charts |
| `/expenses` | Record expenses |
| `/income` | Record income |
| `/review` | Browse / edit transactions |
| `/change` | Transfers and FX conversions |
| `/debts` | Money owed to you / by you |
| `/accounts` | Create and manage accounts |
| `/categories` | Create and manage categories |
| `/templates` | Recurring presets |
| `/settings` | Rates, appearance, preferences |

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Next.js development server |
| `npm run build` | Production build (`output: "standalone"`) |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run db:generate` | Prisma client generate |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:deploy` | `prisma migrate deploy` (production / CI) |
| `npm run db:seed` | Ensure Settings row exists |
| `npm run db:studio` | Prisma Studio |

## Docker (full stack)

```bash
docker compose up --build
```

- App: [http://localhost:3000](http://localhost:3000)
- Postgres volume: `finance_tracker_pg`
- Entrypoint runs `prisma migrate deploy` + seed, then starts the standalone server
- Seed only ensures Settings; it never creates accounts or categories

## Kubernetes

See `k8s/manifests.yaml` for a sample deployment (ConfigMap, Deployment, Service, probes on `/api/health`).

Create your own Secret (`finance-tracker-secrets`) with `DATABASE_URL` before applying. Update image name and hosts as needed:

```bash
docker build -t finance-tracker:latest .
kubectl apply -f k8s/manifests.yaml
```

## Domain model

| Entity | Role |
| --- | --- |
| `Account` | User-created checking / cash accounts |
| `AccountDivision` | Needs / Play / Investment / Savings (per account) |
| `Category` | User-created EXPENSE / INCOME labels |
| `Transaction` | External expense or income (`Decimal(19,4)`) |
| `Transfer` | Internal ACCOUNT / DIVISION / CONVERSION |
| `Debt` | Open / settled IOUs linked to ledger entries |
| `Settings` | Display currency + EUR→CHF rate (+ appearance prefs) |

Balances = Σ income − Σ expenses − Σ transfer out + Σ transfer in per division.

## API overview

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness / readiness |
| `GET` | `/api/dashboard` | Aggregated dashboard |
| `GET` / `POST` | `/api/accounts` | List / create accounts |
| `GET` / `POST` | `/api/categories` | List / create categories |
| `GET` / `POST` | `/api/transactions?type=` | List / create EXPENSE or INCOME |
| `PATCH` / `DELETE` | `/api/transactions/[id]` | Update / delete |
| `GET` / `POST` | `/api/transfers` | List / create changes |
| `DELETE` | `/api/transfers/[id]` | Delete change |
| `GET` / `PATCH` | `/api/settings` | FX / display / appearance |

## Contributing

Issues and pull requests are welcome. For larger changes, open an issue first.

Before opening a PR:

```bash
npm run lint
npm run build
```

## License

MIT — see [LICENSE](LICENSE).
