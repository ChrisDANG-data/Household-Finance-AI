# LangGraph Orchestrator

Python FastAPI + LangGraph service for **hybrid multi-agent** orchestration.

## Purpose

- Read-only reasoning over snapshots from `apps/web` (via HTTP)
- Router → specialist agents (cost, investment, payments) → composer
- No direct DB writes

## Hybrid routing (apps/web)

The Next.js orchestrator uses LangGraph **only** when:

1. The question is **complex** (afford, what-if, tradeoffs), or
2. `analyst_mode` is `cost` | `investment` | `payments`

Simple ledger queries (month totals, category payments, partner splits) stay in TypeScript deterministic paths.

## Run locally

```bash
cd services/langgraph-orchestrator
python -m venv .venv
. .venv/Scripts/activate   # Windows
pip install -r requirements.txt
set APP_WEB_BASE_URL=http://localhost:3000
uvicorn app.main:app --host 0.0.0.0 --port 8081
```

Or via Docker Compose (uses `host.docker.internal:3000`):

```bash
docker compose up -d langgraph
```

## Environment

| Variable | Description |
|----------|-------------|
| `APP_WEB_BASE_URL` | Next.js base URL for read-only API calls |
| (apps/web) `LANGGRAPH_ENABLED=true` | Enable hybrid LangGraph path |
| (apps/web) `LANGGRAPH_URL=http://localhost:8081` | Orchestrator URL |

## Endpoint

`POST /orchestrate`

### Request

```json
{
  "message": "Can I afford a $500/month car payment?",
  "user_id": "default",
  "months": 12,
  "forecast_start_month": "2026-06",
  "analyst_mode": "auto",
  "ai_provider": "claude"
}
```

### Response

```json
{
  "answer": "### Cost analyst\n...",
  "recommendation": "Compare the cost outlook...",
  "intent": "affordability_check",
  "confidence": 0.82,
  "agents_used": ["cost", "payments", "investment"]
}
```

## Graph

```text
router → specialists (httpx → apps/web APIs) → composer → END
```

Specialists call:

- `POST /api/financial-state/snapshot` (cost)
- `GET /api/integrations/plaid/accounts` + `/history` (investment)
- `GET /api/financial-state/ledger` (payments)
