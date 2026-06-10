---
name: save-chat-code-to-obsidian
description: >-
  Save code snippets and learning notes from Cursor chat to the Obsidian vault
  for later review. Use when the user asks to save chat code, when finishing a
  coding or learning session, or when implementing TypeScript/JavaScript/AI
  features they want to study afterward.
---

# Save chat code to Obsidian

## Vault location

Read `OBSIDIAN_VAULT_PATH` from `apps/web/.env`. Default fallback:

`{repo}/Obsidian Vault`

## When to save

Save a note when **any** of these apply:

1. User asks to save code for learning / review / Obsidian
2. You implemented non-trivial code (new service, API route, React component, Prisma change)
3. User is learning AI, TypeScript, or Next.js patterns in this session
4. End of a multi-file change — offer one consolidated learning note

Do **not** save secrets (`.env`, API keys, tokens).

## File path

```
09_Code_From_Chat/YYYY-MM-DD_short-topic.md
```

- `short-topic`: kebab-case, max 40 chars (e.g. `obsidian-wiki-export`, `prisma-ledger-query`)
- If the file exists, append a `## Update HH:MM` section instead of overwriting

## Note template

```markdown
---
date: YYYY-MM-DD
tags: [learning, cursor, typescript]
topic: short topic
source: cursor-chat
---

# Title — YYYY-MM-DD

## Context
One paragraph: what problem we solved and why.

## What I learned
- Bullet points in plain language (good for review)

## Code

### path/to/file.ts
\`\`\`typescript
// paste the important snippet only — not entire files unless small
\`\`\`

## Related
- [[02_Decisions/...]] if a decision was involved
- [[01_Architecture/ARCHITECTURE]] if architecture changed

## Follow-up
- [ ] Optional review tasks
```

## Rules

1. **Include file paths** above each code block
2. **Prefer teachable snippets** over huge dumps; trim boilerplate
3. **Explain in plain language** under "What I learned" — user is learning JS/TS/AI
4. **Link** to ADRs or architecture notes when relevant (`[[wikilink]]`)
5. After writing, tell the user the exact path and suggest Graph view / daily review
6. Run `npm run sync:obsidian` only if docs/logs also need refresh — not required per code note

## Also update (optional)

- `03_Build_Log/YYYY-MM-DD_Session.md` — bullet under **Completed** if this was a major session
- `04_Bugs/` — if the session fixed a bug (use Bug template from `_templates/`)

## Example trigger phrases

- "save this to Obsidian"
- "I want to review this code later"
- "learning note"
- "save chat code"
