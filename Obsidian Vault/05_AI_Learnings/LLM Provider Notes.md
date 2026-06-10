# LLM provider notes

## Claude
- Default for scenario chat; Haiku 4.5 for cost
- Retired models break with 404 — check `ANTHROPIC_MODEL`

## Gemini
- Toggle in UI; watch rate limits on Vercel

## LangGraph
- Local Docker `:8081`; hybrid toggle in UI
- Vercel needs reachable URL or use Direct mode

Log file: `apps/web/logs/llm-calls.jsonl`
