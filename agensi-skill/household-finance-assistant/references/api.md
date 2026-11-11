# Agent API reference

Base URL: `HFI_BASE_URL` (default `https://household-financial-web.vercel.app`)

Every request needs:

```
Authorization: Bearer <HFI_API_KEY>
```

The key identifies the user. A `user_id` in the body or query is ignored.

All responses use one envelope:

```json
{ "success": true, "data": { } }
{ "success": false, "error": { "code": "RATE_LIMITED", "message": "..." } }
```

## GET /api/agent/me

Checks the key. Does not use the daily allowance.

```json
{
  "authenticated": true,
  "usage": { "limit": 20, "used": 3, "remaining": 17, "resets_at": "2026-11-12T00:00:00.000Z" }
}
```

`limit` and `remaining` are `null` when the server has no limit configured.

## POST /api/agent/question

Uses one request from the daily allowance.

| Field | Type | Notes |
|-------|------|-------|
| `message` | string, required | The user's question, max 1000 characters |
| `months` | integer 1–12, optional | Forecast horizon, default 6 |

```json
{ "reply": "Total expenses in July: $4,210.00 ...", "route": "ledger", "usage": { } }
```

Show `reply` to the user as written.

## GET /api/agent/summary?month=YYYY-MM

Deterministic monthly summary. No AI call, does not use the allowance.
`month` defaults to the previous UTC month.

```json
{ "month": "2026-10", "label": "October 2026", "text": "...", "summary": { } }
```

`text` is ready to show. `summary` holds the same numbers as fields
(`opening_balance`, `income_total`, `expense_total`, `investment_total`,
`net_cash_flow`, `closing_balance`, and per-category breakdowns).

## POST /api/agent/ledger-event

Adds income, an expense, or an investment. **Previews unless `confirm` is `true`.**

| Field | Values |
|-------|--------|
| `kind` | `income`, `expense`, `investment` (required) |
| `category` | e.g. `salary`, `rent`, `rrsp` (required) |
| `amount` | positive number (required) |
| `frequency` | `monthly` (default), `weekly`, `yearly`, `quarterly`, `one_time` |
| `month` | `2026-05`, `May`, `May 2026` — one-time entry starting that month |
| `start_date` / `end_date` | `YYYY-MM-DD` |
| `owner` | `partner_a` (default), `partner_b`, `joint` |
| `currency` | default `CAD` |
| `confirm` | `true` to save; anything else previews |

Preview (HTTP 200): `{ "status": "preview", "reply": "Save expense rent $1,800.00 (monthly, from 2026-11-11)? Reply yes to confirm.", "preview": { } }`

Saved (HTTP 201): `{ "status": "saved", "reply": "Saved: ...", "event": { } }`

## Errors

| HTTP | `error.code` | Cause |
|------|--------------|-------|
| 400 | `VALIDATION_ERROR` | Missing or invalid field |
| 401 | `UNAUTHORIZED` | Key missing, malformed, unknown, or revoked |
| 404 | `NOT_FOUND` | No data for the requested month |
| 429 | `RATE_LIMITED` | Daily AI allowance reached; resets at 00:00 UTC |
