#!/usr/bin/env node
// Household Finance Assistant — small client for the FinIntel agent API.
// Network: talks ONLY to HFI_BASE_URL over HTTPS, sending HFI_API_KEY as a Bearer token.
// No dependencies. Requires Node.js 18+ (built-in fetch).

const BASE_URL = (
  process.env.HFI_BASE_URL || "https://household-financial-web.vercel.app"
).replace(/\/+$/, "");
const API_KEY = process.env.HFI_API_KEY || "";

const USAGE = `Usage:
  node hfi.mjs me
  node hfi.mjs ask "<question>" [--months N]
  node hfi.mjs summary [YYYY-MM]
  node hfi.mjs add <income|expense|investment> <category> <amount>
        [--frequency monthly|weekly|yearly|quarterly|one_time] [--month 2026-05]
        [--start YYYY-MM-DD] [--end YYYY-MM-DD] [--owner partner_a|partner_b|joint]
        [--currency CAD] [--confirm]`;

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--confirm") {
      flags.confirm = true;
    } else if (arg.startsWith("--")) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        fail(`Missing value for ${arg}\n\n${USAGE}`);
      }
      flags[arg.slice(2)] = value;
      i++;
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

async function call(method, path, body) {
  if (!API_KEY) {
    fail(
      "HFI_API_KEY is not set. Sign in to the web app, open 'API keys', create a key, and set HFI_API_KEY.",
    );
  }
  if (!BASE_URL.startsWith("https://") && !/^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE_URL)) {
    fail("HFI_BASE_URL must use https:// (http:// is allowed only for localhost).");
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    fail(`Could not reach ${BASE_URL}: ${error instanceof Error ? error.message : error}`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    fail(`Unexpected response from server (HTTP ${response.status}).`);
  }

  if (!payload.success) {
    const { code = "ERROR", message = "Request failed" } = payload.error ?? {};
    fail(`${code} (HTTP ${response.status}): ${message}`, 2);
  }
  return payload.data;
}

function usageLine(usage) {
  if (!usage || usage.limit === null || usage.limit === undefined) return "";
  return `[AI requests left today: ${usage.remaining} of ${usage.limit}]`;
}

const [command, ...rest] = process.argv.slice(2);
const { positional, flags } = parseArgs(rest);

switch (command) {
  case "me": {
    const data = await call("GET", "/api/agent/me");
    console.log(`Connected to ${BASE_URL}`);
    console.log(usageLine(data.usage) || "[No daily AI limit configured]");
    break;
  }
  case "ask": {
    const message = positional.join(" ").trim();
    if (!message) fail(USAGE);
    const body = { message };
    if (flags.months) body.months = Number(flags.months);
    const data = await call("POST", "/api/agent/question", body);
    console.log(data.reply);
    const line = usageLine(data.usage);
    if (line) console.log(`\n${line}`);
    break;
  }
  case "summary": {
    const month = positional[0];
    if (month && !/^\d{4}-\d{2}$/.test(month)) fail("Month must look like 2026-10.");
    const query = month ? `?month=${encodeURIComponent(month)}` : "";
    const data = await call("GET", `/api/agent/summary${query}`);
    console.log(data.text);
    break;
  }
  case "add": {
    const [kind, category, amountRaw] = positional;
    const amount = Number(amountRaw);
    if (!["income", "expense", "investment"].includes(kind) || !category || !(amount > 0)) {
      fail(USAGE);
    }
    const body = { kind, category, amount, confirm: flags.confirm === true };
    if (flags.frequency) body.frequency = flags.frequency;
    if (flags.month) body.month = flags.month;
    if (flags.start) body.start_date = flags.start;
    if (flags.end) body.end_date = flags.end;
    if (flags.owner) body.owner = flags.owner;
    if (flags.currency) body.currency = flags.currency;
    const data = await call("POST", "/api/agent/ledger-event", body);
    console.log(data.reply);
    if (data.status === "preview") {
      console.log("(Preview only — nothing was saved. Re-run with --confirm after the user agrees.)");
    }
    break;
  }
  default:
    fail(USAGE);
}
