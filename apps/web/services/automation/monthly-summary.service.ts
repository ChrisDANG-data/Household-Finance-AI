import { serializeTimeline } from "@/lib/serialize-scenario-response";
import type { SerializedTimelineMonth } from "@/lib/serialize-scenario-response";
import {
  addMonths,
  currentUtcMonth,
  parseMonth,
} from "@/services/financial-state/dates";
import {
  DEFAULT_USER_ID,
  financialStatePersistence,
} from "@/services/financial-state/financial-state.persistence";
import { simulateForecast } from "@/services/financial-state/projection";
import { AppError } from "@/utils/errors";

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatMoney(amount: number, currency = "CAD"): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function monthLabel(month: string): string {
  const { year, month: m } = parseMonth(month);
  return `${MONTH_LABELS[m - 1]} ${year}`;
}

function resolveTargetMonth(raw?: string | null): string {
  const trimmed = raw?.trim();
  if (trimmed) {
    parseMonth(trimmed);
    return trimmed;
  }
  return addMonths(currentUtcMonth(), -1);
}

function categoryLines(
  byCategory: Record<string, number> | undefined,
  currency: string,
): string {
  const entries = Object.entries(byCategory ?? {}).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  if (entries.length === 0) return "  (none)";
  return entries.map(([cat, amt]) => `  - ${cat}: ${formatMoney(amt, currency)}`).join("\n");
}

function buildEmailBody(month: string, entry: SerializedTimelineMonth): string {
  const label = monthLabel(month);
  const currency = "CAD";
  const fmt = (n: number) => formatMoney(n, currency);

  return `FinIntel - ${label} Summary

Opening balance:  ${fmt(entry.opening_balance)}
Income:           ${fmt(entry.income_total)}
Expenses:         ${fmt(entry.expense_total)}
Investments:      ${fmt(entry.investment_total)}
Net cash flow:    ${fmt(entry.net_cash_flow)}
Closing balance:  ${fmt(entry.closing_balance)}

Income breakdown:
${categoryLines(entry.income_by_category, currency)}

Expense breakdown:
${categoryLines(entry.expense_by_category, currency)}

Investment breakdown:
${categoryLines(entry.investment_by_category, currency)}

Sent automatically by FinIntel`;
}

export interface MonthlySummaryResult {
  month: string;
  label: string;
  subject: string;
  body: string;
  summary: SerializedTimelineMonth;
}

export class MonthlySummaryService {
  async build(
    userId: string = DEFAULT_USER_ID,
    month?: string | null,
  ): Promise<MonthlySummaryResult> {
    const targetMonth = resolveTargetMonth(month);
    const state = await financialStatePersistence.loadState(userId, targetMonth);
    const timeline = simulateForecast(state, 1, targetMonth);
    const [entry] = serializeTimeline(timeline);

    if (!entry) {
      throw new AppError(`No forecast data for month ${targetMonth}`, {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }

    const label = monthLabel(targetMonth);
    const netLabel = formatMoney(entry.net_cash_flow);

    return {
      month: targetMonth,
      label,
      subject: `FinIntel ${label} — Net ${netLabel}`,
      body: buildEmailBody(targetMonth, entry),
      summary: entry,
    };
  }
}

export const monthlySummaryService = new MonthlySummaryService();
