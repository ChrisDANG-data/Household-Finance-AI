---
status: Accepted
date: 2026-06-09
---

# Plaid: Direct API vs MCP

## Options
- Plaid MCP wrapper
- Direct Plaid API (`link/token/create`, balances)

## Decision
Direct Plaid API in Next.js routes; MCP optional for future automation only.

## Reason
More control, easier debugging, fewer moving parts for MVP.

See [[06_APIs/Plaid]]
