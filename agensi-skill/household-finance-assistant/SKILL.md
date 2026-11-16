---
name: household-finance-assistant
description: >-
  Answer household money questions from the user's own Household Financial
  Intelligence (FinIntel) account — monthly income and expenses, cash-flow
  forecasts, "can we afford it" checks, and monthly summaries — and add ledger
  entries after the user confirms. Use when the user asks about their household
  budget, ledger, upcoming bills, affordability, or wants to record income, an
  expense, or an investment in FinIntel.
---

# Household Finance Assistant

Connects your agent to a hosted **Household Financial Intelligence (FinIntel)**
account. FinIntel keeps one ledger per user and computes every total and
forecast in deterministic code. Your job is to route the question, relay the
answer, and never do the money math yourself.

## What this skill sends over the network

Be upfront with the user about this:

- Every call goes to `HFI_BASE_URL` (default
  `https://household-financial-web.vercel.app`) over HTTPS with the user's API
  key in the `Authorization` header. No other host is contacted.
- The question text is sent to that service, which may pass it to Anthropic
  (Claude) to write the explanation and to OpenAI to search uploaded documents.
- Nothing is sent until the user asks a finance question or asks to add an entry.

## Setup (one time)

1. The user creates an account at `HFI_BASE_URL` and signs in.
2. They open **API keys** in the top bar, create a key, and copy it. It starts
   with `hfi_` and is shown only once.
3. They set two environment variables (see `config/env.example`):
   - `HFI_API_KEY` — the key
   - `HFI_BASE_URL` — optional; only for a self-hosted copy
4. Check the connection: `node scripts/hfi.mjs me`

If `HFI_API_KEY` is missing, stop and walk the user through these steps. Do not
ask the user to paste the key into the chat, and never print, log, or commit it.

## Commands

Run from this skill's folder. Requires Node.js 18+ (no packages to install).

| Goal | Command |
|------|---------|
| Check key + requests left today | `node scripts/hfi.mjs me` |
| Ask a finance question | `node scripts/hfi.mjs ask "Can we afford a $5,000 trip in August?"` |
| Monthly summary (no AI, free) | `node scripts/hfi.mjs summary 2026-10` |
| Preview a ledger entry | `node scripts/hfi.mjs add expense rent 1800 --frequency monthly` |
| Save it after the user says yes | same command plus `--confirm` |

Full request and response details: `references/api.md`.

## Rules

1. **Never calculate money yourself.** Do not add, multiply, or re-derive
   totals from anything the service returns. Relay the `reply` text as given.
   If the user wants a different breakdown, ask the service again.
2. **Prefer `summary` for plain month totals.** It is deterministic and does
   not use the daily AI allowance. Use `ask` for questions, comparisons,
   affordability, and what-if.
3. **Writes need a yes.** `add` only previews by default. Show the preview
   line to the user, wait for a clear yes, then run it again with `--confirm`.
   Never add `--confirm` on the first call.
4. **One account only.** The key decides whose data is used. There is no way
   to pick another user, and you must not try.
5. **Stay inside the data.** If the reply says there is no data, say so. Do not
   fill gaps with estimates or general assumptions about the household.
6. **Empty accounts come first.** A new account has no data. If `ask` replies that
   the account has no data yet (route `empty_account`), or `summary` is all zeros,
   do not present that as a financial result. Tell the user their account is
   empty and offer to add their income, regular expenses, and a starting balance
   (ledger entries via `add`, balances on the website's Balances page).
7. **This is not financial advice.** Present results as information from the
   user's own ledger, not as a recommendation to buy, sell, or borrow.

## Handling errors

| Status | Meaning | What to do |
|--------|---------|------------|
| 401 `UNAUTHORIZED` | Key missing, wrong, or revoked | Ask the user to create a new key in **API keys** |
| 429 `RATE_LIMITED` | Daily AI allowance used up | Tell the user when it resets (in the message); `summary` still works |
| 400 `VALIDATION_ERROR` | Bad input | Fix the input from the message and retry once |
| 5xx | Service problem | Tell the user; do not retry in a loop |

## Demo notice

The public instance is a demonstration service with no uptime guarantee. Bank
connections there use sandbox (test) data. Tell users not to enter real account
numbers or documents they would not want stored on a demo service.
