import {
  addMonths,
  currentUtcMonth,
  dateToMonth,
  isDateInMonth,
  isEventActiveInMonth,
  parseMonth,
} from "./dates";
import type { FinancialEvent, FinancialEventFrequency } from "./types";
import type { FinancialState, FinancialTimelineState } from "./state.types";

const WEEKS_PER_MONTH = 4.33;

/** Weekly amount scaled to a monthly equivalent (deterministic). */
export function monthlyEquivalentAmount(
  amount: number,
  frequency: FinancialEventFrequency,
): number {
  switch (frequency) {
    case "weekly":
      return amount * WEEKS_PER_MONTH;
    case "yearly":
    case "monthly":
    case "one_time":
      return amount;
    default:
      return amount;
  }
}

function assertMonthFormat(month: string): void {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error(`Invalid month (expected YYYY-MM): ${month}`);
  }
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Event is active in the target month (inclusive month boundaries, UTC).
 * start_date <= month_end AND (end_date is null OR end_date >= month_start)
 */
export function isEventActiveInTargetMonth(
  event: FinancialEvent,
  month: string,
): boolean {
  return isEventActiveInMonth(event.start_date, event.end_date ?? null, month);
}

/** Yearly events apply only in the calendar month of start_date (each year). */
export function isYearlyAnniversaryMonth(startDate: Date, month: string): boolean {
  const { month: targetMonth } = parseMonth(month);
  return startDate.getUTCMonth() + 1 === targetMonth;
}

/** One-time events apply only when start_date falls in the target month. */
export function isOneTimeInTargetMonth(event: FinancialEvent, month: string): boolean {
  return isDateInMonth(event.start_date, month);
}

/**
 * Whether this event contributes cash flow in the target month (frequency expansion).
 */
export function frequencyAppliesInMonth(event: FinancialEvent, month: string): boolean {
  if (!isEventActiveInTargetMonth(event, month)) {
    return false;
  }

  switch (event.frequency) {
    case "one_time":
      return isOneTimeInTargetMonth(event, month);
    case "yearly":
      return isYearlyAnniversaryMonth(event.start_date, month);
    case "monthly":
    case "weekly":
      return true;
    default:
      return false;
  }
}

function eventAmountForMonth(event: FinancialEvent, month: string): number {
  if (!frequencyAppliesInMonth(event, month)) {
    return 0;
  }

  if (event.frequency === "weekly") {
    return monthlyEquivalentAmount(event.amount, "weekly");
  }

  return event.amount;
}

function isIncomeEvent(event: FinancialEvent): boolean {
  return event.type === "income";
}

/** Events shown in active_events for the month (aligned with frequency expansion). */
export function shouldListAsActiveEvent(
  event: FinancialEvent,
  month: string,
): boolean {
  if (!isEventActiveInTargetMonth(event, month)) {
    return false;
  }
  if (event.frequency === "one_time" || event.type === "one_time_expense") {
    return isOneTimeInTargetMonth(event, month);
  }
  if (event.frequency === "yearly") {
    return isYearlyAnniversaryMonth(event.start_date, month);
  }
  return true;
}

function isExpenseEvent(event: FinancialEvent): boolean {
  return (
    event.type === "recurring_expense" ||
    event.type === "one_time_expense" ||
    event.type === "liability"
  );
}

/**
 * Deterministic monthly cash flow projection for a single month.
 * Does not mutate state. No AI, no database.
 */
export function projectMonth(
  state: FinancialState,
  month: string,
): FinancialTimelineState {
  assertMonthFormat(month);

  let income_total = 0;
  let expense_total = 0;
  const active_events: FinancialEvent[] = [];

  for (const event of state.events) {
    if (shouldListAsActiveEvent(event, month)) {
      active_events.push(event);
    }

    const amount = eventAmountForMonth(event, month);
    if (amount <= 0) continue;

    if (isIncomeEvent(event)) {
      income_total += amount;
    } else if (isExpenseEvent(event)) {
      expense_total += amount;
    }
  }

  income_total = roundMoney(income_total);
  expense_total = roundMoney(expense_total);

  return {
    month,
    income_total,
    expense_total,
    net_cash_flow: roundMoney(income_total - expense_total),
    active_events,
  };
}

/**
 * Sequential monthly projections from the current UTC month (or custom start).
 */
export function simulateForecast(
  state: FinancialState,
  months: number = 12,
  startMonth?: string,
): FinancialTimelineState[] {
  if (months < 1 || months > 120) {
    throw new Error("Forecast months must be between 1 and 120");
  }

  const start = startMonth ?? currentUtcMonth();
  assertMonthFormat(start);

  const timeline: FinancialTimelineState[] = [];
  for (let i = 0; i < months; i++) {
    timeline.push(projectMonth(state, addMonths(start, i)));
  }
  return timeline;
}

export function computeDerivedFields(
  state: Pick<FinancialState, "current_cash" | "monthly_income" | "events">,
  referenceMonth: string,
): FinancialState["computed"] {
  const timeline = projectMonth(
    {
      user_id: "",
      current_cash: state.current_cash,
      monthly_income: state.monthly_income,
      events: state.events,
      computed: emptyComputed(),
    },
    referenceMonth,
  );

  const monthly_expenses = timeline.expense_total;
  const monthly_income_from_events = timeline.income_total;
  const effective_income = Math.max(state.monthly_income, monthly_income_from_events);

  const monthly_net_cash_flow = roundMoney(effective_income - monthly_expenses);
  const burn_rate =
    monthly_net_cash_flow < 0 ? roundMoney(Math.abs(monthly_net_cash_flow)) : 0;

  const runway_months =
    burn_rate > 0 ? roundMoney(state.current_cash / burn_rate) : null;

  let fixedExpenses = 0;
  let totalExpenses = 0;
  for (const event of state.events) {
    if (!isExpenseEvent(event)) continue;
    const amount = eventAmountForMonth(event, referenceMonth);
    totalExpenses += amount;
    if (event.metadata.is_fixed) {
      fixedExpenses += amount;
    }
  }

  const fixed_cost_ratio =
    totalExpenses > 0 ? roundMoney(fixedExpenses / totalExpenses) : 0;

  return {
    monthly_net_cash_flow,
    burn_rate,
    runway_months,
    fixed_cost_ratio,
  };
}

export function buildFinancialState(
  input: Omit<FinancialState, "computed"> & { computed?: FinancialState["computed"] },
  referenceMonth: string,
): FinancialState {
  const computed =
    input.computed ?? computeDerivedFields(input, referenceMonth);
  return { ...input, computed };
}

function emptyComputed(): FinancialState["computed"] {
  return {
    monthly_net_cash_flow: 0,
    burn_rate: 0,
    runway_months: null,
    fixed_cost_ratio: 0,
  };
}
