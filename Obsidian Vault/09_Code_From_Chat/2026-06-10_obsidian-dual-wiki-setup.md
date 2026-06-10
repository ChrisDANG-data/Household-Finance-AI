---
date: 2026-06-10
tags: [learning, cursor, typescript, obsidian, nextjs]
topic: obsidian-dual-wiki-setup
source: cursor-chat
---

# Obsidian dual wiki (household + engineering) — 2026-06-10

## Context

FinIntel needs two kinds of memory in one Obsidian vault:
1. **Household** — auto-generated from uploads/ledger (graph of documents ↔ categories)
2. **Engineering** — decisions, bugs, build log, and **code from Cursor chat** for learning

## What I learned

- Obsidian is the **viewer**; the app writes markdown with `[[wikilinks]]`
- Keep product data under `Household/` so it does not mix with ADRs and learning notes
- `npm run sync:obsidian` copies `docs/*.md` and summarizes `llm-calls.jsonl` (no API keys in notes)
- Sync script uses **today's date** for build logs and new ADR filenames
- Cursor skill `save-chat-code-to-obsidian` tells the agent to save teachable snippets after coding sessions

## Code

### apps/web/services/wiki/compile-wiki.service.ts — household folder prefix

```typescript
export const HOUSEHOLD_WIKI_ROOT = "Household";

function householdPath(relativePath: string): string {
  return `${HOUSEHOLD_WIKI_ROOT}/${relativePath}`;
}

function householdLink(relativePath: string): string {
  return wikiLink(householdPath(relativePath));
}
```

### scripts/sync-engineering-obsidian.mjs — use runtime date

```javascript
const TODAY = new Date().toISOString().slice(0, 10);
// Build log: `03_Build_Log/${TODAY}_Session.md`
// ADR: `02_Decisions/${TODAY}_Obsidian_Engineering_Wiki.md`
```

## Related

- [[02_Decisions/2026-06-10_Obsidian_Engineering_Wiki]]
- [[02_Decisions/2026-06-12_RAG_and_Household_Wiki]]
- [[00_Dashboard/Project Dashboard]]

## Follow-up

- [ ] After each coding session, ask Cursor to save one learning note
- [ ] Run `npm run sync:obsidian` weekly for doc + LLM log refresh
