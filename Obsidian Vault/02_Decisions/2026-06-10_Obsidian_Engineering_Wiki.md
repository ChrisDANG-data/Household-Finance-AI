---
status: Accepted
date: 2026-06-10
---

# Obsidian as engineering + learning memory

## Problem
Solo AI project loses *why* decisions were made; chat code is hard to review later.

## Decision
Use one Obsidian vault with numbered folders. Engineering notes manual + synced; household data auto under `Household/`.

## Reason
- Dates and graph view in Obsidian
- Separate product wiki from build memory
- Cursor skill saves chat code to `09_Code_From_Chat/`

## Consequences
- Run `npm run sync:obsidian` for docs + LLM summaries
- FinIntel app still syncs `Household/` on upload

Related: [[01_Architecture/ARCHITECTURE]]
