# 🏋️ Mellitrack — Personal Fitness Tracker

A lightweight, single-user fitness tracking web app. Log your training sessions, track sets (weight × reps), and visualize your progress with interactive charts.

Built for one person, runs on Cloudflare's edge. No database setup, no server management — just deploy and go.

---

## Features

- **📝 Training Logging** — Record training sessions by date. Select a category (e.g. Oberkörper, Unterkörper), pick exercises, and enter sets with weight and reps.
- **⏪ Auto-Prefill** — When you start a new training in a category, the last session's sets are pre-filled — just tweak the numbers.
- **📊 Progress Charts** — Line charts show weight and rep progression over time, per exercise or aggregated by category.
- **🗂️ Exercise Management** — Create, rename, reorder, and delete exercises and categories. Exercises with training history are soft-deleted (kept in historical data).
- **🔄 Draft Recovery** — If you start typing a training and accidentally navigate away, your draft is saved in `localStorage` and restored on return.
- **🔒 Simple Auth** — Session cookie with SHA-256 password hashing. Register or log in with username/password.
- **📱 Mobile-Friendly** — Responsive layout built with Tailwind CSS.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite + Tailwind CSS + React Router + Recharts |
| **Backend** | Hono (lightweight web framework) |
| **Runtime** | Cloudflare Workers |
| **Database** | Cloudflare D1 (SQLite-compatible) |
| **Auth** | HTTP-only session cookie + SHA-256 |
| **CI/CD** | GitHub Actions |
| **E2E Tests** | Playwright |

---

## Getting Started

### Prerequisites

- Node.js 22+ (required by Wrangler 4.x)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (installed via `npm install -g wrangler` or uses npx)
- A Cloudflare account with Workers and D1 enabled

### Local Dev Setup

```bash
# Clone & install
git clone https://github.com/flash1293/mellitrack.git
cd mellitrack
npm install

# Create local D1 database
npx wrangler d1 create mellitrack-db-local  # (first time only)
# Then add the binding to wrangler.toml or use --local

# Apply migrations to local D1
npx wrangler d1 migrations apply mellitrack-db --local

# Seed with default user (demo123) and categories
npx wrangler d1 execute mellitrack-db --local --file=./scripts/seed.sql

# Start dev server (Vite + local D1 worker)
npm run dev
```

This runs two processes concurrently:
1. `wrangler dev` — serves the Hono backend on port 8787 with local D1
2. `vite` — React dev server on port 5173, proxying `/api` to the worker

Open [http://localhost:5173](http://localhost:5173) and log in with `default` / `demo123`.

### Commands

```bash
npm run dev              # Start local dev (Vite + local D1)
npm run typecheck        # TypeScript type checking
npm run build            # Build for production (React build + inline assets)
npm run deploy           # Build + deploy to Cloudflare Workers
npm run db:migrate       # Apply migrations to local D1
npm run db:migrate:prod  # Apply migrations to production D1
npm run db:seed          # Seed local D1 with demo data
npm run test:e2e         # Headless Playwright E2E tests
npm run test:e2e:ui      # Playwright tests with browser UI
```

---

## Project Structure

```
mellitrack/
├── src/
│   ├── client/              # React SPA
│   │   ├── main.tsx         # Entry point
│   │   ├── App.tsx          # Router + auth guard
│   │   ├── api.ts           # API client (fetch wrappers with auth)
│   │   ├── index.css        # Tailwind imports + global styles
│   │   ├── components/      # Shared UI (Layout, BackgroundSelector)
│   │   └── pages/           # Route pages
│   │       ├── Login.tsx
│   │       ├── Register.tsx
│   │       ├── Dashboard.tsx       # Category-aggregated charts
│   │       ├── TrainingList.tsx    # Browse & delete trainings
│   │       ├── TrainingForm.tsx    # Create/edit training with sets
│   │       ├── ExerciseList.tsx    # Manage exercises & categories
│   │       └── ProgressPage.tsx    # Per-exercise chart + history table
│   └── server/              # Hono (Cloudflare Worker)
│       ├── index.ts         # Entry point, auth middleware, static serving
│       ├── static-manifest.ts    # Auto-generated — inlined static assets
│       └── routes/          # Hono sub-routers
│           ├── auth.ts      # Login, register, logout, session check
│           ├── exercises.ts # CRUD for exercises & categories, reorder
│           ├── trainings.ts # CRUD for trainings, prefill data
│           └── progress.ts  # Per-exercise & per-category progress queries
├── migrations/
│   ├── 0001_initial.sql     # Schema (users, exercises, categories, trainings, sets)
│   └── 0002_add_sort_order.sql  # Sort order initialization
├── scripts/
│   ├── inline-static.ts     # Build step: inlines dist/ into static-manifest.ts
│   ├── seed.sql             # Demo seed data
│   ├── d1_api.py            # Python helper for preview D1 operations
│   └── local-dev.ts         # Local dev server (Hono with Node)
├── e2e/
│   ├── basic.spec.ts        # Playwright test
│   └── global-setup.ts      # Seeds local D1 before test run
├── dist/                    # Production build output (gitignored)
├── .github/workflows/       # CI/CD pipelines
├── wrangler.toml            # Cloudflare Worker configuration
├── vite.config.ts
└── tailwind.config.js
```

---

## Architecture

### Static Assets

Mellitrack doesn't use Cloudflare KV for static files. Instead, the build script (`scripts/inline-static.ts`) reads the built `dist/` folder and generates `src/server/static-manifest.ts` — a TypeScript file that exports all assets as inlined strings. The worker imports this file and serves assets from memory. This avoids KV caching issues and simplifies deployment to a single worker script.

### Database (D1)

A single Cloudflare D1 database. Schema changes are tracked as SQL migration files in `migrations/`. To modify the schema:

1. Create a new migration file (e.g. `migrations/0003_add_column.sql`)
2. Apply locally: `npm run db:migrate`
3. Apply to production: `npm run db:migrate:prod`

**Key tables:**
- `users` — username + SHA-256 password hash
- `exercise_categories` — grouping categories with `sort_order`
- `exercises` — individual exercises, with `deleted_at` for soft-delete
- `exercise_category_mappings` — many-to-many: exercises ↔ categories
- `trainings` — training session by date + category
- `training_exercises` — which exercises in a training
- `sets` — individual sets (set_number, weight, reps) per training exercise

### Auth Flow

1. User logs in with username + password
2. Password is SHA-256 hashed server-side and compared to stored hash
3. On success, the server sets an HTTP-only `session` cookie containing the user ID
4. Middleware on protected routes verifies the cookie against the `users` table
5. Session expires after 7 days

### Prefill Logic

When creating a new training for a category, the form prefills sets from the *most recent training in the same category*. The endpoint `GET /api/trainings/last-category/:categoryId` returns all exercises with their last-known sets, ordered by the previous training's exercise order.

### Soft Delete / Tombstoning

Exercises that have been used in trainings can't be hard-deleted (would break historical data). Instead:
- Referenced exercises → soft-delete (set `deleted_at`)
- Unreferenced exercises → hard-delete (removed from DB)
- Tombstoned exercises are hidden from training forms but preserved in charts and history

---

## Configuration

### `wrangler.toml`

```toml
name = "mellitrack"
main = "src/server/index.ts"
compatibility_date = "2024-05-12"

[[d1_databases]]
binding = "DB"
database_name = "mellitrack-db"
database_id = "<your-database-id>"

[[routes]]
pattern = "your-domain.com"
custom_domain = true
```

### Required Secrets / Environment (for deployment)

| Variable | Description |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Workers + D1 permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

---

## Deployment

### Production

Push to `main` → GitHub Actions runs the [production deployment workflow](.github/workflows/prod-deploy.yml):

1. Apply any pending D1 migrations
2. Build the app (`npm run build`)
3. Deploy worker with `wrangler deploy`

You can also deploy manually:

```bash
npm run deploy
```

### Preview Deployments

When you open a PR against `main`, GitHub Actions:
1. Creates or reuses a preview D1 database (`mellitrack-db-pr-N`)
2. Applies migrations + seeds with demo data
3. Deploys a preview worker at `mellitrack-pr-N.<subdomain>.workers.dev`
4. Comments the preview URL on the PR

When the PR is merged or closed, the preview worker and database are cleaned up.

---

## CI/CD Workflows

| Workflow | Trigger | Actions |
|---|---|---|
| `ci.yml` | PR / push to `main` | TypeScript type check, production build, Playwright E2E tests |
| `preview-deploy.yml` | PR opened/synchronized | Preview D1 + worker deployment, URL comment on PR |
| `preview-cleanup.yml` | PR closed | Delete preview worker + D1 database |
| `prod-deploy.yml` | Push to `main` | Migrate prod D1, build, deploy worker |

---

## Development Notes

### Adding a New Migration

```bash
# Create migration
touch migrations/0003_my_change.sql
# Edit the SQL file with ALTER TABLE / CREATE TABLE statements

# Apply locally
npm run db:migrate

# Apply to production
npm run db:migrate:prod
```

### Running E2E Tests

```bash
# One-time: install Playwright browsers
npx playwright install --with-deps chromium

# Run tests (headless)
npm run test:e2e

# Run with Playwright UI
npm run test:e2e:ui
```

The tests seed a local D1 database with demo data before running.

### Draft Recovery

The training form auto-saves to `localStorage` as you type. If you navigate away accidentally:
- A banner appears informing you the draft was restored
- You can dismiss it and start fresh

---

## License

Private project — all rights reserved.
