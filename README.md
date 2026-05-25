# Household Financial Intelligence

Production-ready **Next.js (App Router)** scaffold for an AI-powered household financial intelligence system. Organized as **four engines** with AI limited to explanation only. Architecture and placeholders only — **no business features** are implemented yet.

## Documentation

| Document | Description |
|----------|-------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, data flow, folder conventions, extension points |
| [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md) | What each npm package is for and what to add later |
| [apps/web/.env.example](apps/web/.env.example) | Environment variables with required/optional/future labels |

## Tech stack

- **Next.js** 16 (App Router) + **TypeScript**
- **Tailwind CSS** v4 + **shadcn/ui**
- **Prisma ORM** 6 + **PostgreSQL**

## Setup & development

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | **20.19+** recommended (20.18+ works with Prisma 6) |
| npm | 9+ (comes with Node) |
| PostgreSQL | 14+ (local, Docker, or cloud) |

Optional: [Docker](https://docs.docker.com/get-docker/) for a local Postgres container.

### 1. Clone and install

```bash
cd /path/to/Final_Project_AI

# Install all workspace dependencies (root + apps/web)
npm install
```

### 2. Configure environment

```bash
cp apps/web/.env.example apps/web/.env
```

Edit `apps/web/.env` and set at minimum:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/household_finance?schema=public"
```

See [apps/web/.env.example](apps/web/.env.example) for every variable, including AI, OCR, vector store, and TTS placeholders.

### 3. Start PostgreSQL

**Option A — Docker**

```bash
docker run --name hfi-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=household_finance \
  -p 5432:5432 \
  -d postgres:16
```

Then in `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/household_finance?schema=public"
```

**Option B — Local PostgreSQL**

Create a database and user, then set `DATABASE_URL` to match your instance.

### 4. Initialize the database

The schema has no models yet (scaffold only). Push the datasource so Prisma can connect:

```bash
cd apps/web
npx prisma db push
```

When you add models to `prisma/schema.prisma`:

```bash
npm run db:migrate
```

### 5. Generate Prisma client

```bash
cd apps/web
npx prisma generate
```

This also runs automatically on `npm install` (`postinstall`) and `npm run build`.

### 6. Run the dev server

From repository root:

```bash
npm run dev
```

Or from `apps/web`:

```bash
npm run dev
```

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | Bootstrap landing page (layer overview) |
| http://localhost:3000/scenario | Scenario Chat UI (streaming advisor + dashboard) |
| http://localhost:3000/api/health | Health check (`database: true` when Postgres is reachable) |

### 7. Run financial simulation tests

```bash
cd apps/web
npm test
```

Deterministic harness: `services/financial-state/__tests__/simulation.test.ts`

### 8. Verify production build (optional)

```bash
npm run build
npm run start
```

### Troubleshooting

| Issue | Fix |
|-------|-----|
| `Missing required environment variable: DATABASE_URL` | Create `apps/web/.env` from `.env.example` |
| Health shows `database: false` | Start Postgres; confirm `DATABASE_URL`; run `npx prisma db push` |
| Prisma install fails on Node 20.18 | Project uses Prisma 6; or upgrade Node to 20.19+ |
| Port 3000 in use | `npm run dev -- --port 3001` |

## Project structure

```
apps/web/
├── app/api/
│   ├── documents/           # Document Intelligence Engine
│   ├── financial-state/     # Financial State Engine
│   ├── simulation/          # Forecast Simulation Engine
│   └── explain/             # AI Explanation Layer
├── services/
│   ├── document-intelligence/
│   ├── financial-state/
│   ├── forecast-simulation/
│   └── ai-explanation/
├── types/                   # Per-engine contracts
├── prompts/
│   ├── document-intelligence/
│   └── explanation/
└── ...
```

Four-engine design (AI does not compute or store): [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## API routes (placeholders)

Non-health routes return **501 Not Implemented** until features are built.

| Method | Path | Engine |
|--------|------|--------|
| `GET` | `/api/health` | Financial State |
| `POST` | `/api/documents/upload` | Document Intelligence |
| `GET` | `/api/documents/upload/[documentId]` | Document Intelligence |
| `POST` | `/api/documents/extraction` | Document Intelligence |
| `POST` | `/api/documents/embeddings` | Document Intelligence |
| `POST` | `/api/documents/rag` | Document Intelligence |
| `POST` | `/api/financial-state/snapshot` | Financial State (deterministic engine) |
| `POST` | `/api/financial-state/events` | Financial State (DB ingest, future) |
| `GET` | `/api/financial-state/ledger` | Financial State |
| `POST` | `/api/simulation/forecast` | Forecast Simulation |
| `POST` | `/api/simulation/scenarios` | Forecast Simulation |
| `GET` | `/api/simulation/scenarios/[scenarioId]` | Forecast Simulation |
| `POST` | `/api/explain` | AI Explanation |
| `POST` | `/api/explain/narration` | AI Explanation |
| `POST` | `/api/scenario-chat` | Scenario Chat (NL orchestration) |

## Database commands

Run from `apps/web` or via root workspace scripts:

```bash
npm run db:generate   # Regenerate Prisma Client
npm run db:migrate    # Create & apply migrations (after models exist)
npm run db:push       # Push schema to DB without migration files
npm run db:studio     # Open Prisma Studio GUI
```

## Next steps

1. Add Prisma models (`Document`, `Conversation`, etc.) — see comments in `prisma/schema.prisma`.
2. Implement one vertical slice (e.g. upload → storage → DB row).
3. Wire env vars in `lib/env.ts` as each provider is added.
4. Add npm SDKs listed in [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md) only when needed.
