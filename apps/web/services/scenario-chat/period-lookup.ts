import { addMonths } from "@/services/financial-state/dates";
import { projectMonth } from "@/services/financial-state/projection";
import {
  DEFAULT_USER_ID,
  financialStatePersistence,
} from "@/services/financial-state/financial-state.persistence";
import type { FinancialState } from "@/services/financial-state/state.types";

import {
  detectQueryKind,
  extractTargetMonth,
  formatMoney,
  monthLabel,
  type MonthLookupOptions,
} from "./monthly-lookup";

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

export function extractTargetYear(message: string): string | null {
  const match = message.match(/\b(20\d{2})\b/);
  return match?.[1] ?? null;
}

function hasMonthName(message: string): boolean {
  const lower = message.toLowerCase();
  return MONTH_NAMES.some((name) => new RegExp(`\\b${name}\\b`, "i").test(lower));
}

export function extractMonthRange(
  message: string,
): { start: string; end: string } | null {
  const lower = message.toLowerCase();

  const betweenMatch = lower.match(
    /\b(?:from|between)\s+(.+?)\s+(?:to|through|until)\s+(.+?)(?:\?|\.|$)/i,
  );
  if (betweenMatch) {
    const start = extractTargetMonth(betweenMatch[1]);
    const end = extractTargetMonth(betweenMatch[2]);
    if (start && end && start <= end) {
      return { start, end };
    }
  }

  const directMatch = lower.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(20\d{2}))?\s+to\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(20\d{2}))?/i,
  );
  if (directMatch) {
    const start = extractTargetMonth(directMatch[0]);
    const yearHint =
      directMatch[4] ?? directMatch[2] ?? extractTargetYear(message) ?? "";
    const end = extractTargetMonth(`${directMatch[3]} ${yearHint}`.trim());
    if (start && end && start <= end) {
      return { start, end };
    }
  }

  return null;
}

function isAggregationKeywordQuery(message: string): boolean {
  const lower = message.toLowerCase();
  return [
    "total",
    "expense",
    "income",
    "cash flow",
    "net cash",
    "how much",
    "sum",
    "spent",
    "spending",
    "investment",
  ].some((word) => lower.includes(word));
}

export function isPeriodAggregationQuery(message: string): boolean {
  if (!isAggregationKeywordQuery(message)) return false;
  if (extractMonthRange(message)) return true;

  const year = extractTargetYear(message);
  if (!year) return false;
  if (hasMonthName(message)) return false;

  return true;
}

function enumerateMonths(start: string, end: string): string[] {
  const months: string[] = [];
  let current = start;
  while (current <= end) {
    months.push(current);
    current = addMonths(current, 1);
  }
  return months;
}

function periodLabel(
  range: { start: string; end: string } | null,
  year: string | null,
): string {
  if (range) {
    return `${monthLabel(range.start)} to ${monthLabel(range.end)}`;
  }
  return year ?? "period";
}

function monthAmount(
  entry: ReturnType<typeof projectMonth>,
  kind: ReturnType<typeof detectQueryKind>,
): number {
  switch (kind) {
    case "income":
      return entry.income_total;
    case "expenses":
      return entry.expense_total + entry.investment_total;
    case "net_cash_flow":
      return entry.net_cash_flow;
    case "closing_balance":
      return entry.closing_balance;
    case "opening_balance":
      return entry.opening_balance;
    default:
      return entry.net_cash_flow;
  }
}

function kindLabel(kind: ReturnType<typeof detectQueryKind>): string {
  switch (kind) {
    case "income":
      return "income";
    case "expenses":
      return "expenses";
    case "closing_balance":
      return "closing balance";
    case "opening_balance":
      return "opening balance";
    default:
      return "net cash flow";
  }
}

/**
 * Deterministic multi-month totals (calendar year or explicit month range).
 */
export async function tryDeterministicPeriodAnswer(
  message: string,
  options?: MonthLookupOptions,
): Promise<string | null> {
  if (!isPeriodAggregationQuery(message)) return null;

  const range = extractMonthRange(message);
  const year = range ? null : extractTargetYear(message);
  if (!range && !year) return null;

  const months = range
    ? enumerateMonths(range.start, range.end)
    : enumerateMonths(`${year}-01`, `${year}-12`);

  if (months.length === 0) return null;

  const state =
    options?.state ??
    (await financialStatePersistence.loadState(
      options?.userId ?? DEFAULT_USER_ID,
      options?.startMonth ?? months[0],
    ));

  const kind = detectQueryKind(message);
  const label = periodLabel(range, year);
  const typeLabel = kindLabel(kind);

  let total = 0;
  const monthLines: string[] = [];

  for (const month of months) {
    const entry = projectMonth(state, month, 0);
    const amount = monthAmount(entry, kind);
    total += amount;
    monthLines.push(`• ${monthLabel(month).padEnd(18)}${formatMoney(amount)}`);
  }

  total = Number(total.toFixed(2));

  const header = `Total ${typeLabel} in ${label}: ${formatMoney(total)}`;
  return [header, monthLines.join("\n")].join("\n\n");
}
