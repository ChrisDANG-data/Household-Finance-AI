import { currentUtcMonth } from "@/services/financial-state/dates";
import {
  DEFAULT_USER_ID,
  financialStatePersistence,
} from "@/services/financial-state/financial-state.persistence";
import {
  frequencyAppliesInMonth,
  monthlyEquivalentAmount,
  simulateForecast,
} from "@/services/financial-state/projection";
import { OWNER_LABELS } from "@/services/financial-state/types";
import type {
  FinancialEvent,
  FinancialEventOwner,
} from "@/services/financial-state/types";
import type { PartnerBalanceSlice } from "@/services/financial-state/state.types";

import { extractTargetMonth, monthLabel } from "./monthly-lookup";

const INCOME_QUERY =
  /\b(income|salary|salaries|earn|earnings|take.?home|paycheque|paycheck)\b/i;
const EXPENSE_QUERY =
  /\b(expense|expenses|spend|spending|cost|costs|payment|payments)\b/i;
const BALANCE_QUERY =
  /\b(opening|closing)\s+balance\b|\bnet\s+cash\s+flow\b|\bbalance\b/i;

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatLine(category: string, amount: number): string {
  const label = category.replace(/_/g, " ").padEnd(22, " ");
  return `• ${label}${formatMoney(amount)}`;
}

function parsePartner(message: string): FinancialEventOwner | null {
  const lower = message.toLowerCase();
  if (/\bpartner\s*b\b|\bpartner\s*b's\b|\bpartner_b\b/.test(lower)) {
    return "partner_b";
  }
  if (/\bpartner\s*a\b|\bpartner\s*a's\b|\bpartner_a\b/.test(lower)) {
    return "partner_a";
  }
  if (/\bjoint\b|\bboth\s+partners\b/.test(lower)) {
    return "joint";
  }
  return null;
}

function partnerShare(
  owner: FinancialEventOwner,
  target: FinancialEventOwner,
  amount: number,
): number {
  if (target === "joint") {
    if (owner === "joint") return amount;
    return 0;
  }
  if (owner === "joint") return amount / 2;
  if (owner === target) return amount;
  return 0;
}

/** Recurring monthly-equivalent for income (excludes one-time unless month-specific). */
function steadyMonthlyIncome(event: FinancialEvent, forMonth: string | null): number {
  if (event.type !== "income") return 0;

  if (forMonth) {
    if (!frequencyAppliesInMonth(event, forMonth)) return 0;
    if (event.frequency === "weekly") {
      return monthlyEquivalentAmount(event.amount, "weekly");
    }
    return event.amount;
  }

  switch (event.frequency) {
    case "monthly":
      return event.amount;
    case "weekly":
      return monthlyEquivalentAmount(event.amount, "weekly");
    case "yearly":
      return event.amount / 12;
    case "quarterly":
      return event.amount / 3;
    case "one_time":
      return 0;
    default:
      return event.amount;
  }
}

function steadyMonthlyExpense(event: FinancialEvent, forMonth: string | null): number {
  const isExpense =
    event.type === "recurring_expense" ||
    event.type === "one_time_expense" ||
    event.type === "liability" ||
    event.type === "investment";

  if (!isExpense) return 0;

  if (forMonth) {
    if (!frequencyAppliesInMonth(event, forMonth)) return 0;
    if (event.frequency === "weekly") {
      return monthlyEquivalentAmount(event.amount, "weekly");
    }
    return event.amount;
  }

  switch (event.frequency) {
    case "monthly":
      return event.amount;
    case "weekly":
      return monthlyEquivalentAmount(event.amount, "weekly");
    case "yearly":
      return event.amount / 12;
    case "quarterly":
      return event.amount / 3;
    case "one_time":
      return 0;
    default:
      return event.amount;
  }
}

function isPartnerBalanceQuery(message: string): boolean {
  const partner = parsePartner(message);
  if (!partner || partner === "joint") return false;
  return BALANCE_QUERY.test(message);
}

function isPartnerLedgerQuery(message: string): boolean {
  const partner = parsePartner(message);
  if (!partner || partner === "joint") return false;
  if (isPartnerBalanceQuery(message)) return true;
  return INCOME_QUERY.test(message) || EXPENSE_QUERY.test(message);
}

function partnerSlice(
  balances: NonNullable<
    Awaited<ReturnType<typeof simulateForecast>>[number]["partner_balances"]
  >,
  partner: "partner_a" | "partner_b",
): PartnerBalanceSlice {
  return balances[partner];
}

async function tryPartnerBalanceAnswer(
  message: string,
  userId: string,
): Promise<string | null> {
  if (!isPartnerBalanceQuery(message)) return null;

  const partner = parsePartner(message);
  if (!partner || partner === "joint") return null;

  const targetMonth = extractTargetMonth(message);
  if (!targetMonth) return null;

  const state = await financialStatePersistence.loadState(userId, targetMonth);
  const timeline = simulateForecast(state, 12, currentUtcMonth());
  const monthRow = timeline.find((row) => row.month === targetMonth);
  if (!monthRow?.partner_balances) {
    return `No partner forecast data for ${monthLabel(targetMonth)}.`;
  }

  const slice = partnerSlice(monthRow.partner_balances, partner);
  const partnerLabel = OWNER_LABELS[partner];
  const label = monthLabel(targetMonth);
  const lower = message.toLowerCase();

  if (lower.includes("opening") && lower.includes("balance")) {
    return `${partnerLabel} opening balance in ${label}: ${formatMoney(slice.opening_balance)}`;
  }
  if (lower.includes("net cash") || lower.includes("cash flow")) {
    return `${partnerLabel} net cash flow in ${label}: ${formatMoney(slice.net_cash_flow)}`;
  }
  return `${partnerLabel} closing balance in ${label}: ${formatMoney(slice.closing_balance)}`;
}

/**
 * Deterministic Partner A/B income, expense, or balance from ledger (owner field).
 */
export async function tryPartnerLedgerAnswer(
  message: string,
  userId: string = DEFAULT_USER_ID,
): Promise<string | null> {
  if (!isPartnerLedgerQuery(message)) return null;

  const balanceAnswer = await tryPartnerBalanceAnswer(message, userId);
  if (balanceAnswer) return balanceAnswer;

  const partner = parsePartner(message);
  if (!partner || partner === "joint") return null;

  const targetMonth = extractTargetMonth(message);
  const refMonth = targetMonth ?? currentUtcMonth();
  const state = await financialStatePersistence.loadState(userId, refMonth);

  const wantsIncome = INCOME_QUERY.test(message);
  const wantsExpense = EXPENSE_QUERY.test(message);
  const partnerLabel = OWNER_LABELS[partner];

  const lines: string[] = [];
  let total = 0;

  for (const event of state.events) {
    let base = 0;
    if (wantsIncome && !wantsExpense) {
      base = steadyMonthlyIncome(event, targetMonth);
    } else if (wantsExpense && !wantsIncome) {
      base = steadyMonthlyExpense(event, targetMonth);
    } else {
      base =
        steadyMonthlyIncome(event, targetMonth) ||
        steadyMonthlyExpense(event, targetMonth);
    }

    const share = partnerShare(event.owner, partner, base);
    if (share <= 0) continue;

    total += share;
    lines.push(formatLine(event.category, share));
  }

  const periodLabel = targetMonth
    ? monthLabel(targetMonth)
    : "monthly (recurring equivalent)";
  const kindLabel =
    wantsIncome && !wantsExpense
      ? "income"
      : wantsExpense && !wantsIncome
        ? "expenses"
        : "cash flows";

  if (lines.length === 0) {
    return `No ${kindLabel} recorded for ${partnerLabel} in your ledger${targetMonth ? ` for ${monthLabel(targetMonth)}` : ""}.`;
  }

  const header = `${partnerLabel} ${kindLabel} — ${periodLabel}:`;
  return `${header}\n\n${lines.join("\n")}\n\nTotal: ${formatMoney(total)}`;
}
