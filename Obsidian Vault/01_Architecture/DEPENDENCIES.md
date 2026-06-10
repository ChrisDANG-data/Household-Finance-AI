# Dependencies

All runtime dependencies live in **`apps/web/package.json`**. The root `package.json` only defines npm workspaces and convenience scripts.

## Runtime dependencies

| Package | Version (approx) | Purpose in this project |
|---------|------------------|-------------------------|
| **next** | 16.x | React framework: App Router, API routes, SSR/RSC, production build |
| **react** / **react-dom** | 19.x | UI runtime for pages and components |
| **typescript** | 5.x (dev) | Static typing across app, services, and types |
| **@prisma/client** | 6.x | Generated database client; used by `lib/prisma.ts` and `services/financial-state/` |
| **tailwindcss** | 4.x (dev) | Utility-first CSS; v4 uses CSS-first config via `@tailwindcss/postcss` |
| **@tailwindcss/postcss** | 4.x (dev) | PostCSS plugin that compiles Tailwind in the Next.js build |
| **@base-ui/react** | 1.x | Headless accessible primitives; powers shadcn/ui components (e.g. Button) |
| **class-variance-authority** | 0.7.x | `cva()` for variant-based component styles (shadcn button variants) |
| **clsx** | 2.x | Conditional class names; composed by `tailwind-merge` in `lib/utils.ts` |
| **tailwind-merge** | 3.x | Merges Tailwind classes without conflicts (`cn()` helper) |
| **lucide-react** | 1.x | Icon set used by shadcn/ui components |
| **tw-animate-css** | 1.x | Animation utilities referenced from `app/globals.css` |
| **shadcn** | 4.x | CLI/tooling for adding and updating shadcn/ui components (dev workflow) |

### Not installed yet (add when implementing features)

These are **not** in `package.json` today but match reserved env vars and service stubs:

| Area | Examples | When to add |
|------|----------|-------------|
| LLM SDKs | `openai`, `@anthropic-ai/sdk` | `services/ai-explanation/` only |
| OCR | `@google-cloud/vision`, Azure SDK | `document-intelligence/extraction/` |
| Vector DB | `@pinecone-database/pinecone`, `@qdrant/js-client-rest` | `document-intelligence/indexing/` |
| File storage | `@vercel/blob` (blob), local disk (dev) | `STORAGE_PROVIDER=local|blob` |
| Validation | `zod` | Request/env schema validation at API boundary |
| Auth | `next-auth` / Clerk / Auth0 | Multi-user households |

## Dev dependencies

| Package | Purpose |
|---------|---------|
| **prisma** | CLI: `generate`, `migrate`, `db push`, Studio |
| **dotenv** | Loads `.env` for Prisma CLI via `prisma.config.ts` |
| **eslint** / **eslint-config-next** | Linting aligned with Next.js 16 |
| **@types/node**, **@types/react**, **@types/react-dom** | TypeScript definitions |

## Version notes

### Prisma 6 vs 7

The project pins **Prisma 6** because Prisma 7 requires **Node.js 20.19+**. On Node 20.18.x, use Prisma 6 or upgrade Node before moving to Prisma 7.

### Node.js

- **Minimum (current setup):** Node 20.18+ with Prisma 6
- **Recommended:** Node **20.19+** or **22.12+** for alignment with Next.js/ESLint engine warnings and future Prisma 7

### npm workspaces

Root `package.json` uses `"workspaces": ["apps/*"]` so you can run from the repo root:

```bash
npm run dev          # runs apps/web dev script
npm run db:migrate   # runs apps/web db:migrate
```

Dependencies are hoisted to the root `node_modules` where npm workspaces allow; the app still resolves imports from `apps/web`.

## Scripts tied to dependencies

| Script | Command | Depends on |
|--------|---------|------------|
| `dev` | `next dev` | next, react |
| `build` | `prisma generate && next build` | prisma, next |
| `postinstall` | `prisma generate` | prisma, @prisma/client |
| `db:generate` | `prisma generate` | prisma |
| `db:migrate` | `prisma migrate dev` | prisma, PostgreSQL |
| `db:push` | `prisma db push` | prisma, PostgreSQL |
| `db:studio` | `prisma studio` | prisma |

## Internal modules (not npm packages)

| Path | Role |
|------|------|
| `lib/prisma.ts` | Singleton Prisma client (dev hot-reload safe) |
| `lib/env.ts` | Typed `process.env` access |
| `lib/utils.ts` | `cn()` for shadcn (required by `components.json` aliases) |
| `utils/` | App-level helpers separate from shadcn’s `lib/utils` |
| `services/document-intelligence/` | Upload, OCR, extraction, RAG |
| `services/financial-state/` | Canonical ledger, Prisma, conversation store |
| `services/forecast-simulation/` | Deterministic forecast & scenario math |
| `services/ai-explanation/` | LLM reasoning and narration only |
| `prompts/explanation/` | Prompts for AI Explanation Layer |
| `prompts/document-intelligence/` | Constrained document structuring prompts |
| `types/` | Shared interfaces consumed by services and API routes |
