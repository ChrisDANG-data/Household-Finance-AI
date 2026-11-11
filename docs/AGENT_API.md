# Agent API — per-user API keys and daily AI limit

Lets an AI agent (Claude Code, Cursor, …) use the app on behalf of **one** user.
This is what the Agensi skill in [`agensi-skill/`](../agensi-skill/) talks to.

## How it works

| Piece | Where | Notes |
|-------|-------|-------|
| API keys | `services/auth/api-key.service.ts`, table `api_keys` | Key looks like `hfi_…`. Only a SHA-256 hash is stored; the key is shown once. Max 5 active keys per user. |
| Key management | `/api-keys` page, `GET/POST /api/auth/api-keys`, `DELETE /api/auth/api-keys/[id]` | Requires a normal signed-in session. |
| Agent routes | `/api/agent/me`, `/question`, `/summary`, `/ledger-event` | `Authorization: Bearer hfi_…`. The user id always comes from the key; `user_id` in the request is ignored. |
| Daily AI limit | `services/usage/ai-usage.service.ts`, table `ai_usage_daily` | Counts per user per UTC day. Over the limit → HTTP 429 `RATE_LIMITED`. |

The limit applies to `/api/agent/question`, web scenario chat (`/api/scenario-chat`),
and document extraction previews. It does **not** yet cover voice transcription
(`/api/stt/transcribe`) or embeddings created on upload.

Request/response details: [`agensi-skill/household-finance-assistant/references/api.md`](../agensi-skill/household-finance-assistant/references/api.md).

## Deploying this change

Order matters — create the tables **before** the new code goes live.

1. From `apps/web`, with `DATABASE_URL` pointing at the target database:

   ```bash
   npm run db:push
   ```

   This only adds two new tables (`api_keys`, `ai_usage_daily`). It does not change existing tables.

2. Optional, in Vercel → Settings → Environment Variables:

   ```env
   AI_DAILY_LIMIT=20
   ```

   Unset = 20 per day when login is enabled (Vercel), unlimited in local dev. `0` = no limit.

3. Push to `main` so Vercel redeploys.

4. Check: sign in → **API keys** → create a key, then

   ```bash
   curl -H "Authorization: Bearer hfi_your_key" https://household-financial-web.vercel.app/api/agent/me
   ```

If the code is deployed before step 1, chat keeps working (the limit is skipped
with a server warning), but creating API keys fails until the tables exist.

## Turning access off

- **One key:** the user revokes it on `/api-keys`, or set `revoked_at` on the row in `api_keys`.
- **One user:** revoke all their rows in `api_keys`.
- **Everyone:** set `AI_DAILY_LIMIT=1` (or remove `ANTHROPIC_API_KEY`) in Vercel and redeploy.

## Notes

- The shared `AUTOMATION_WEBHOOK_TOKEN` routes (`/api/automation/*`) are still there for
  your own n8n workflows. That token can act as any `user_id`, so **never** give it to
  other people or put it in a skill package.
- The public demo login shares one account, so anyone using it shares that account's
  API keys and daily allowance.
