#!/usr/bin/env node
/**
 * Sync engineering docs, LLM log summaries, and vault scaffolding to Obsidian.
 * Reads OBSIDIAN_VAULT_PATH from apps/web/.env (or OBSIDIAN_VAULT_PATH env).
 *
 * Usage: npm run sync:obsidian
 */

import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const WEB_ENV = path.join(REPO_ROOT, "apps", "web", ".env");
const DOCS_DIR = path.join(REPO_ROOT, "docs");
const LLM_LOG = path.join(REPO_ROOT, "apps", "web", "logs", "llm-calls.jsonl");

/** ISO date for filenames and frontmatter (vault machine local → UTC date). */
const TODAY = new Date().toISOString().slice(0, 10);

const FOLDERS = [
  "00_Dashboard",
  "01_Architecture",
  "02_Decisions",
  "03_Build_Log",
  "04_Bugs",
  "05_AI_Learnings",
  "06_APIs",
  "07_Prompts",
  "08_Roadmap",
  "09_Code_From_Chat",
  "10_Logs",
  "_templates",
  "Household",
];

async function loadVaultPath() {
  if (process.env.OBSIDIAN_VAULT_PATH?.trim()) {
    return process.env.OBSIDIAN_VAULT_PATH.trim();
  }
  try {
    const raw = await readFile(WEB_ENV, "utf8");
    for (const line of raw.split("\n")) {
      const match = line.match(/^OBSIDIAN_VAULT_PATH\s*=\s*"?([^"\n]+)"?\s*$/);
      if (match) return match[1].trim();
    }
  } catch {
    // fall through
  }
  return path.join(REPO_ROOT, "Obsidian Vault");
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function writeNote(vaultPath, relativePath, content) {
  const full = path.join(vaultPath, relativePath);
  await ensureDir(path.dirname(full));
  await writeFile(full, content, "utf8");
  return relativePath;
}

function frontmatter(fields) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(fields)) {
    lines.push(`${key}: ${value}`);
  }
  lines.push("---", "");
  return lines.join("\n");
}

async function copyDocsToArchitecture(vaultPath) {
  const destDir = path.join(vaultPath, "01_Architecture");
  await ensureDir(destDir);
  const copied = [];
  try {
    const files = await readdir(DOCS_DIR);
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const src = path.join(DOCS_DIR, file);
      const dest = path.join(destDir, file);
      await copyFile(src, dest);
      copied.push(`01_Architecture/${file}`);
    }
  } catch {
    // docs missing
  }
  return copied;
}

async function summarizeLlmLog() {
  let raw = "";
  try {
    raw = await readFile(LLM_LOG, "utf8");
  } catch {
    return {
      total: 0,
      markdown: "_No LLM log file found at `apps/web/logs/llm-calls.jsonl`._\n",
    };
  }

  const lines = raw.split("\n").filter(Boolean);
  const entries = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // skip bad line
    }
  }

  const byStatus = { success: 0, fail: 0 };
  const byProvider = {};
  const byCaller = {};
  const byDate = {};
  let totalCost = 0;
  const failures = [];

  for (const e of entries) {
    byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
    byProvider[e.provider] = (byProvider[e.provider] ?? 0) + 1;
    byCaller[e.caller] = (byCaller[e.caller] ?? 0) + 1;
    const day = (e.started_at ?? "").slice(0, 10);
    if (day) byDate[day] = (byDate[day] ?? 0) + 1;
    totalCost += Number(e.estimated_cost_usd ?? 0);
    if (e.status === "fail") {
      const err = (e.error ?? "unknown").split("\n")[0].slice(0, 120);
      failures.push({
        at: e.started_at,
        caller: e.caller,
        provider: e.provider,
        error: err,
      });
    }
  }

  const md = [
    "# LLM calls summary",
    "",
    `Synced: ${new Date().toISOString()}`,
    `Source: [[../../apps/web/logs/llm-calls.jsonl]] (repo; not copied — summaries only)`,
    "",
    "## Totals",
    `- Calls: ${entries.length}`,
    `- Success: ${byStatus.success ?? 0}`,
    `- Failed: ${byStatus.fail ?? 0}`,
    `- Est. cost (USD): $${totalCost.toFixed(4)}`,
    "",
    "## By provider",
    ...Object.entries(byProvider).map(([k, v]) => `- ${k}: ${v}`),
    "",
    "## By caller",
    ...Object.entries(byCaller)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `- ${k}: ${v}`),
    "",
    "## By date",
    ...Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `- ${k}: ${v}`),
    "",
    "## Recent failures (sanitized)",
  ];

  if (failures.length === 0) {
    md.push("- _None recorded._");
  } else {
    for (const f of failures.slice(-15)) {
      md.push(`- ${f.at} · ${f.provider} · ${f.caller} · ${f.error}`);
    }
  }

  md.push(
    "",
    "## Notes",
    "- Full prompts/responses stay in jsonl locally; do not paste API keys into Obsidian.",
    "- Link: [[05_AI_Learnings/LLM Provider Notes]]",
    "",
  );

  return { total: entries.length, markdown: md.join("\n") };
}

async function writeScaffolding(vaultPath) {
  const written = [];

  written.push(
    await writeNote(
      vaultPath,
      "README.md",
      [
        "# AI Finance Project — Obsidian vault",
        "",
        "Dual purpose:",
        "1. **Engineering memory** — decisions, bugs, build log, code from Cursor chat",
        "2. **Household wiki** — auto-generated under `Household/` from FinIntel uploads",
        "",
        "Start at [[00_Dashboard/Project Dashboard]].",
        "",
        "Sync engineering content: `npm run sync:obsidian` from repo root.",
        "",
      ].join("\n"),
    ),
  );

  written.push(
    await writeNote(
      vaultPath,
      "00_Dashboard/Project Dashboard.md",
      [
        frontmatter({
          type: "dashboard",
          project: "Household Financial Intelligence",
          updated: TODAY,
        }),
        "# Project Dashboard",
        "",
        "## Engineering",
        "- [[01_Architecture/ARCHITECTURE]]",
        `- [[02_Decisions/${TODAY}_Obsidian_Engineering_Wiki]]`,
        `- [[03_Build_Log/${TODAY}_Session]]`,
        "- [[09_Code_From_Chat/README]]",
        "- [[10_Logs/LLM Calls Summary]]",
        "",
        "## Product (auto-generated)",
        "- [[Household/README]]",
        "",
        "## Quick actions",
        "- Run `npm run sync:obsidian` after doc changes or LLM logging",
        "- FinIntel **Documents** page → Sync local vault / Download ZIP",
        "- Ask Cursor: **save chat code to Obsidian** after learning sessions",
        "",
      ].join("\n"),
    ),
  );

  const templates = {
    "_templates/ADR Template.md": [
      "# Decision: TITLE",
      "",
      "Status: Proposed | Accepted | Superseded",
      "Date: YYYY-MM-DD",
      "",
      "## Problem",
      "",
      "## Options",
      "- ",
      "",
      "## Decision",
      "",
      "## Reason",
      "",
      "## Consequences",
      "",
    ].join("\n"),
    "_templates/Build Log Template.md": [
      "# Build Log YYYY-MM-DD",
      "",
      "## Completed",
      "- ",
      "",
      "## Blocked",
      "- ",
      "",
      "## Next",
      "- ",
      "",
      "## Links",
      "- ",
      "",
    ].join("\n"),
    "_templates/Bug Template.md": [
      "# Bug: TITLE",
      "",
      "Date: YYYY-MM-DD",
      "Status: Open | Fixed",
      "",
      "## Symptom",
      "",
      "## Root cause",
      "",
      "## Fix",
      "",
      "## Verification",
      "",
    ].join("\n"),
    "_templates/Chat Code Template.md": [
      "# TOPIC — YYYY-MM-DD",
      "",
      "Tags: #learning #typescript #cursor",
      "Source: Cursor chat",
      "",
      "## What I learned",
      "",
      "## Code",
      "",
      "```typescript",
      "// paste code here",
      "```",
      "",
      "## Files touched",
      "- `path/to/file.ts`",
      "",
      "## Follow-up",
      "- ",
      "",
    ].join("\n"),
  };

  for (const [rel, body] of Object.entries(templates)) {
    written.push(await writeNote(vaultPath, rel, body));
  }

  written.push(
    await writeNote(
      vaultPath,
      "09_Code_From_Chat/README.md",
      [
        "# Code from Cursor chat",
        "",
        "Learning notes: paste or auto-save code snippets from AI pair programming.",
        "",
        "Naming: `YYYY-MM-DD_short-topic.md`",
        "",
        "Template: [[../_templates/Chat Code Template]]",
        "",
      ].join("\n"),
    ),
  );

  return written;
}

async function writeStarterNotes(vaultPath) {
  const notes = [];

  notes.push(
    await writeNote(
      vaultPath,
      `02_Decisions/${TODAY}_Obsidian_Engineering_Wiki.md`,
      [
        frontmatter({ status: "Accepted", date: TODAY }),
        "# Obsidian as engineering + learning memory",
        "",
        "## Problem",
        "Solo AI project loses *why* decisions were made; chat code is hard to review later.",
        "",
        "## Decision",
        "Use one Obsidian vault with numbered folders. Engineering notes manual + synced; household data auto under `Household/`.",
        "",
        "## Reason",
        "- Dates and graph view in Obsidian",
        "- Separate product wiki from build memory",
        "- Cursor skill saves chat code to `09_Code_From_Chat/`",
        "",
        "## Consequences",
        "- Run `npm run sync:obsidian` for docs + LLM summaries",
        "- FinIntel app still syncs `Household/` on upload",
        "",
        "Related: [[01_Architecture/ARCHITECTURE]]",
        "",
      ].join("\n"),
    ),
  );

  notes.push(
    await writeNote(
      vaultPath,
      "02_Decisions/2026-06-09_Plaid_Direct_API.md",
      [
        frontmatter({ status: "Accepted", date: "2026-06-09" }),
        "# Plaid: Direct API vs MCP",
        "",
        "## Options",
        "- Plaid MCP wrapper",
        "- Direct Plaid API (`link/token/create`, balances)",
        "",
        "## Decision",
        "Direct Plaid API in Next.js routes; MCP optional for future automation only.",
        "",
        "## Reason",
        "More control, easier debugging, fewer moving parts for MVP.",
        "",
        "See [[06_APIs/Plaid]]",
        "",
      ].join("\n"),
    ),
  );

  notes.push(
    await writeNote(
      vaultPath,
      "02_Decisions/2026-06-12_RAG_and_Household_Wiki.md",
      [
        frontmatter({ status: "Accepted", date: "2026-06-12" }),
        "# RAG + Obsidian household wiki",
        "",
        "## Decision",
        "On document upload: **both** RAG chunks (pgvector) and markdown wiki (`Household/`) in Obsidian.",
        "",
        "## Reason",
        "- RAG for AI Q&A",
        "- Obsidian graph for human visualization",
        "",
        "## Not the same as",
        "Engineering ADRs in `02_Decisions/` — built for *developer* memory, not end-user documents.",
        "",
      ].join("\n"),
    ),
  );

  notes.push(
    await writeNote(
      vaultPath,
      `03_Build_Log/${TODAY}_Session.md`,
      [
        `# Build Log ${TODAY}`,
        "",
        "## Completed",
        "- Obsidian engineering vault structure",
        "- `npm run sync:obsidian` script (docs + LLM summary)",
        "- Household wiki moved under `Household/`",
        "- Cursor skill: save chat code to Obsidian",
        "",
        "## Next",
        "- Index engineering vault into pgvector (optional)",
        "- n8n git webhook → build log (optional)",
        "",
      ].join("\n"),
    ),
  );

  notes.push(
    await writeNote(
      vaultPath,
      "04_Bugs/2026-05-30_Gemini_Model_404.md",
      [
        "# Bug: Gemini model 404",
        "",
        "Date: 2026-05-30",
        "Status: Fixed",
        "",
        "## Symptom",
        "LLM calls failed: `models/gemini-1.5-flash is not found`.",
        "",
        "## Fix",
        "Set `GEMINI_MODEL=gemini-3-flash-preview` (or current valid model) in `.env`.",
        "",
        "## Verification",
        "[[10_Logs/LLM Calls Summary]] shows success after model change.",
        "",
      ].join("\n"),
    ),
  );

  notes.push(
    await writeNote(
      vaultPath,
      "05_AI_Learnings/LLM Provider Notes.md",
      [
        "# LLM provider notes",
        "",
        "## Claude",
        "- Default for scenario chat; Haiku 4.5 for cost",
        "- Retired models break with 404 — check `ANTHROPIC_MODEL`",
        "",
        "## Gemini",
        "- Toggle in UI; watch rate limits on Vercel",
        "",
        "## LangGraph",
        "- Local Docker `:8081`; hybrid toggle in UI",
        "- Vercel needs reachable URL or use Direct mode",
        "",
        "Log file: `apps/web/logs/llm-calls.jsonl`",
        "",
      ].join("\n"),
    ),
  );

  notes.push(
    await writeNote(
      vaultPath,
      "06_APIs/Plaid.md",
      [
        "# Plaid",
        "",
        "Env: `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV=sandbox`",
        "",
        "Routes:",
        "- `/api/integrations/plaid/link-token`",
        "- `/api/integrations/plaid/exchange`",
        "- `/api/integrations/plaid/balances`",
        "",
        "See [[02_Decisions/2026-06-09_Plaid_Direct_API]]",
        "",
      ].join("\n"),
    ),
  );

  notes.push(
    await writeNote(
      vaultPath,
      "08_Roadmap/MVP.md",
      [
        "# MVP roadmap",
        "",
        "- [x] Document upload + RAG",
        "- [x] Ledger + forecast",
        "- [x] Obsidian household wiki",
        "- [x] Engineering Obsidian vault",
        "- [ ] Engineering RAG / project memory chat",
        "- [ ] Auth (multi-user)",
        "",
      ].join("\n"),
    ),
  );

  return notes;
}

async function main() {
  const vaultPath = await loadVaultPath();
  await ensureDir(vaultPath);

  for (const folder of FOLDERS) {
    await ensureDir(path.join(vaultPath, folder));
  }

  const scaffolding = await writeScaffolding(vaultPath);
  const starters = await writeStarterNotes(vaultPath);
  const docs = await copyDocsToArchitecture(vaultPath);
  const llm = await summarizeLlmLog();
  const logNote = await writeNote(
    vaultPath,
    "10_Logs/LLM Calls Summary.md",
    llm.markdown,
  );

  console.log(`Obsidian vault: ${vaultPath}`);
  console.log(`Folders: ${FOLDERS.length}`);
  console.log(`Docs copied: ${docs.length}`);
  console.log(`LLM log entries summarized: ${llm.total}`);
  console.log(`Notes written: ${scaffolding.length + starters.length + 1}`);
  console.log("Done. Open vault in Obsidian → Graph view (Ctrl+G).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
