import {
  addMonths,
  currentUtcMonth,
  dateToMonth,
  isDateInMonth,
  isEventActiveInMonth,
  parseMonth,
} from "./dates";
import type { FinancialEvent, FinancialEventFrequency, FinancialEventOwner } from "./types";
import type {
  FinancialState,
  FinancialTimelineState,
  PartnerBalanceSlice,
  PartnerBalances,
} from "./state.types";

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

function monthIndex(month: string): number {
  const { year, month: m } = parseMonth(month);
  return year * 12 + (m - 1);
}

/** Quarterly payments every 3 months from the start month (e.g. Aug → Nov → Feb). */
export function isQuarterlyPaymentMonth(startDate: Date, month: string): boolean {
  const startMonth = dateToMonth(startDate);
  const startIdx = monthIndex(startMonth);
  const targetIdx = monthIndex(month);
  if (targetIdx < startIdx) return false;
  return (targetIdx - startIdx) % 3 === 0;
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
    case "quarterly":
      return isQuarterlyPaymentMonth(event.start_date, month);
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
  if (event.frequency === "quarterly") {
    return isQuarterlyPaymentMonth(event.start_date, month);
  }
  return true;
}

function isInvestmentEvent(event: FinancialEvent): boolean {
  return event.type === "investment";
}

function isExpenseEvent(event: FinancialEvent): boolean {
  return (
    event.type === "recurring_expense" ||
    event.type === "one_time_expense" ||
    event.type === "liability"
  );
}

function isOutflowEvent(event: FinancialEvent): boolean {
  return isExpenseEvent(event) || isInvestmentEvent(event);
}

/** Partner share of an amount (joint → 50/50; otherwise full amount to owner). */
export function partnerAmountShare(
  owner: FinancialEventOwner,
  partner: "partner_a" | "partner_b",
  amount: number,
): number {
  if (amount <= 0) return 0;
  if (owner === "joint") return roundMoney(amount / 2);
  if (owner === partner) return roundMoney(amount);
  return 0;
}

/** Resolve month-0 partner openings from manual overrides or a 50/50 split of current_cash. */
export function resolvePartnerOpeningBalances(
  state: Pick<
    FinancialState,
    "current_cash" | "partner_a_opening_cash" | "partner_b_opening_cash"
  >,
): { partnerA: number; partnerB: number } {
  const manualA = state.partner_a_opening_cash;
  const manualB = state.partner_b_opening_cash;
  if (manualA != null && manualB != null) {
    return {
      partnerA: roundMoney(manualA),
      partnerB: roundMoney(manualB),
    };
  }

  const partnerA = roundMoney(state.current_cash / 2);
  return {
    partnerA,
    partnerB: roundMoney(state.current_cash - partnerA),
  };
}

type PartnerFlowTotals = Pick<
  PartnerBalanceSlice,
  "income_total" | "expense_total" | "investment_total" | "net_cash_flow"
>;

function computePartnerMonthFlows(
  events: FinancialEvent[],
  month: string,
): { partner_a: PartnerFlowTotals; partner_b: PartnerFlowTotals } {
  const partner_a = {
    income_total: 0,
    expense_total: 0,
    investment_total: 0,
    net_cash_flow: 0,
  };
  const partner_b = {
    income_total: 0,
    expense_total: 0,
    investment_total: 0,
    net_cash_flow: 0,
  };

  for (const event of events) {
    const amount = eventAmountForMonth(event, month);
    if (amount <= 0) continue;

    const targets = [
      { key: "partner_a" as const, slice: partner_a },
      { key: "partner_b" as const, slice: partner_b },
    ];

    for (const { key, slice } of targets) {
      const share = partnerAmountShare(event.owner, key, amount);
      if (share <= 0) continue;

      if (isIncomeEvent(event)) {
        slice.income_total += share;
      } else if (isInvestmentEvent(event)) {
        slice.investment_total += share;
      } else if (isExpenseEvent(event)) {
        slice.expense_total += share;
      }
    }
  }

  for (const slice of [partner_a, partner_b]) {
    slice.income_total = roundMoney(slice.income_total);
    slice.expense_total = roundMoney(slice.expense_total);
    slice.investment_total = roundMoney(slice.investment_total);
    slice.net_cash_flow = roundMoney(
      slice.income_total - slice.expense_total - slice.investment_total,
    );
  }

  return { partner_a, partner_b };
}

function buildPartnerBalances(
  entry: FinancialTimelineState,
  partnerAOpening: number,
  partnerBOpening: number,
): PartnerBalances {
  const flows = computePartnerMonthFlows(entry.active_events, entry.month);

  const partner_a: PartnerBalanceSlice = {
    opening_balance: roundMoney(partnerAOpening),
    income_total: flows.partner_a.income_total,
    expense_total: flows.partner_a.expense_total,
    investment_total: flows.partner_a.investment_total,
    net_cash_flow: flows.partner_a.net_cash_flow,
    closing_balance: roundMoney(
      partnerAOpening + flows.partner_a.net_cash_flow,
    ),
  };

  const partner_b: PartnerBalanceSlice = {
    opening_balance: roundMoney(partnerBOpening),
    income_total: flows.partner_b.income_total,
    expense_total: flows.partner_b.expense_total,
    investment_total: flows.partner_b.investment_total,
    net_cash_flow: flows.partner_b.net_cash_flow,
    closing_balance: roundMoney(
      partnerBOpening + flows.partner_b.net_cash_flow,
    ),
  };

  return { partner_a, partner_b };
}

/** Attach per-partner opening/closing/net to each forecast month (manual or 50/50 initial cash split). */
export function enrichTimelineWithPartnerBalances(
  timeline: FinancialTimelineState[],
  state: Pick<
    FinancialState,
    "current_cash" | "partner_a_opening_cash" | "partner_b_opening_cash"
  >,
): FinancialTimelineState[] {
  const initial = resolvePartnerOpeningBalances(state);
  let partnerAOpening = initial.partnerA;
  let partnerBOpening = initial.partnerB;

  return timeline.map((entry) => {
    const partner_balances = buildPartnerBalances(
      entry,
      partnerAOpening,
      partnerBOpening,
    );
    partnerAOpening = partner_balances.partner_a.closing_balance;
    partnerBOpening = partner_balances.partner_b.closing_balance;
    return { ...entry, partner_balances };
  });
}

/**
 * Deterministic monthly cash flow projection for a single month.
 * Does not mutate state. No AI, no database.
 */
export function projectMonth(
  state: FinancialState,
  month: string,
  openingBalance: number = 0,
): FinancialTimelineState {
  assertMonthFormat(month);

  let income_total = 0;
  let expense_total = 0;
  let investment_total = 0;
  const active_events: FinancialEvent[] = [];

  for (const event of state.events) {
    if (shouldListAsActiveEvent(event, month)) {
      active_events.push(event);
    }

    const amount = eventAmountForMonth(event, month);
    if (amount <= 0) continue;

    if (isIncomeEvent(event)) {
      income_total += amount;
    } else if (isInvestmentEvent(event)) {
      investment_total += amount;
    } else if (isExpenseEvent(event)) {
      expense_total += amount;
    }
  }

  income_total = roundMoney(income_total);
  expense_total = roundMoney(expense_total);
  investment_total = roundMoney(investment_total);
  const net_cash_flow = roundMoney(
    income_total - expense_total - investment_total,
  );

  return {
    month,
    income_total,
    expense_total,
    investment_total,
    net_cash_flow,
    opening_balance: roundMoney(openingBalance),
    closing_balance: roundMoney(openingBalance + net_cash_flow),
    active_events,
  };
}

/**
 * Sequential monthly projections from the current UTC month (or custom start).
 * Tracks rolling balance starting from state.current_cash.
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
  let balance = state.current_cash;

  for (let i = 0; i < months; i++) {
    const entry = projectMonth(state, addMonths(start, i), balance);
    timeline.push(entry);
    balance = entry.closing_balance;
  }
  return enrichTimelineWithPartnerBalances(timeline, state);
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

  const monthly_expenses = roundMoney(
    timeline.expense_total + timeline.investment_total,
  );
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
    if (!isOutflowEvent(event)) continue;
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
