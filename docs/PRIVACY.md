# Privacy & data handling — Household Financial Intelligence

This document describes what the MVP stores, where it lives, who can access it, and how to request deletion. It reflects **Tier 1 production hardening** (household auth, encrypted Plaid tokens, locked automation webhooks).

> **Not legal advice.** For a public product in Canada, consult counsel on PIPEDA and provincial requirements.

---

## What we collect

| Data type | Examples | Purpose |
|-----------|----------|---------|
| **Ledger events** | Income, expenses, investments | Forecasts, summaries, scenario chat |
| **Financial state** | `current_cash`, monthly income | Opening balance for projections |
| **Uploaded documents** | PDFs, images (bills, policies) | Extraction, obligations, RAG Q&A |
| **Plaid connection** | Encrypted access token, account balances | Live cash / asset sync |
| **Chat / automation** | Questions via web or Telegram (n8n) | AI explanations (not canonical math) |

We do **not** sell household data. LLM providers process text only when you use AI features (see Subprocessors).

---

## Where data is stored

| Layer | Technology | Contents |
|-------|------------|----------|
| **Database** | Neon PostgreSQL | Events, obligations, document text, embeddings, encrypted Plaid tokens |
| **Object storage** | Vercel Blob (prod) or local `.data/uploads` (dev) | Original uploaded files |
| **Application** | Vercel (Next.js) | Server-side API; no persistent disk in production |
| **Optional wiki** | Obsidian vault on your machine | Human-readable export (your control) |
| **Automation** | Local n8n + Telegram | Forwards questions to production API with Bearer token |

---

## Access control (Tier 1)

| Control | Behavior |
|---------|----------|
| **Household login** | On Vercel (and when `AUTH_ENABLED=true`), pages and APIs require a signed session cookie except `/`, `/login`, and auth/health endpoints. |
| **User accounts** | Usernames and **password hashes** (scrypt) live in Postgres `users` table — never plaintext passwords. |
| **Password recovery** | Passwords cannot be looked up or emailed. Each account gets a one-time **recovery code** at sign-up (only a SHA-256 hash is stored); it is the only way to reset a forgotten password and is replaced after each use. Disabled for shared demo accounts (`AUTH_SHARED_ACCOUNTS`). |
| **Abuse limits** | Sign-in, password-reset and sign-up attempts are rate limited per username and per network address. AI requests are capped per user per day and across the whole service. |
| **Agent API keys** | Per-user keys for AI agents (`/api/agent/*`). Only a SHA-256 hash is stored; each key reaches only its owner's data and can be revoked on `/api-keys`. |
| **Automation webhooks** | n8n/Telegram routes require `Authorization: Bearer <AUTOMATION_WEBHOOK_TOKEN>`. In production, the token is **required** (fail closed). |
| **Plaid tokens** | Stored **encrypted at rest** when `TOKEN_ENCRYPTION_KEY` is set (required on Vercel). Never returned to the browser. |
| **Blob files** | Private; read via server token only. |

Local development: auth and encryption are **off by default** unless you set `AUTH_ENABLED=true` and related env vars.

---

## AI & subprocessors

When you use scenario chat, RAG, document extraction, or voice:

- **Anthropic** (Claude, for all AI answers and document extraction) and **OpenAI** (embeddings, Whisper voice transcription) may receive **portions of ledger text, document chunks, or your question**.
- **Google** (Gemini) is not used unless the operator opts in to the voice fallback with `STT_GEMINI_FALLBACK=true`.
- **Money calculations** remain in deterministic code — the LLM explains and retrieves; it does not write ledger truth.

**Production next step (Tier 2):** PII minimization / tokenization before LLM calls (e.g. Presidio-style redaction).

---

## Retention & deletion

| Item | Current behaviour | Planned |
|------|-------------------|---------|
| **Whole account** | The user can delete it on **Account & API keys → Delete account** (password required). Removes ledger events, obligations, balances, documents (rows, search chunks and stored files), Plaid links (revoked at Plaid), API keys, usage counters and the user record. | — |
| Financial events | Manual delete via ledger UI/API | — |
| Single documents | Persist until the account is deleted | Per-document delete |
| Plaid link | Persists until the account is deleted | Disconnect button |
| Sign-in attempt counters | Hashed keys only (no raw IP addresses or usernames); old windows are cleared automatically | — |
| LLM dev logs | Optional `logs/llm-calls.jsonl` locally | Off in production by default |

Shared demo accounts (`AUTH_SHARED_ACCOUNTS`) cannot be deleted by their users. If file or Plaid cleanup fails during deletion, the account is still removed and the failure is logged for the operator to clean up by hand.

---

## Environment variables (security)

Set on **Vercel** before exposing real household data:

```env
AUTH_SECRET=<random 32+ chars>
TOKEN_ENCRYPTION_KEY=<32-byte base64 or 64-char hex>
AUTOMATION_WEBHOOK_TOKEN=<random token for n8n>
AUTH_ALLOW_REGISTRATION=false
```

Create the first production user (from `apps/web`):

```bash
npx tsx scripts/create-user.ts your_username your_password
```

Generate a 32-byte encryption key (PowerShell):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

---

## Contact

For this MVP, the **household operator** (you) is the data controller. Document any support contact here if you ship beyond a personal pilot.

---

## Related docs

- [INTEGRATIONS.md](./INTEGRATIONS.md) — Plaid, n8n, Blob storage
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Four engines & AI boundaries
