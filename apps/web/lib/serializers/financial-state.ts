import type {
  FinancialState,
  FinancialTimelineState,
} from "@/services/financial-state/state.types";
import type { FinancialEvent } from "@/services/financial-state/types";

export interface SerializedFinancialEvent {
  id: string;
  type: FinancialEvent["type"];
  category: string;
  amount: number;
  currency: string;
  frequency: FinancialEvent["frequency"];
  start_date: string;
  end_date: string | null;
  event_date: string | null;
  account_in: string | null;
  account_out: string | null;
  owner: FinancialEvent["owner"];
  confidence: number;
  source_document_id: string | null;
  metadata: FinancialEvent["metadata"];
}

export interface SerializedFinancialState {
  user_id: string;
  current_cash: number;
  monthly_income: number;
  balance_source: import("@/services/financial-state/state.types").BalanceSource;
  manual_balances: import("@/services/financial-state/state.types").ManualAccountBalances;
  partner_a_opening_cash: number | null;
  partner_b_opening_cash: number | null;
  events: SerializedFinancialEvent[];
  computed: FinancialState["computed"];
}

export interface SerializedFinancialTimelineState {
  month: string;
  income_total: number;
  expense_total: number;
  investment_total: number;
  net_cash_flow: number;
  active_events: SerializedFinancialEvent[];
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function serializeFinancialEvent(
  event: FinancialEvent,
): SerializedFinancialEvent {
  return {
    id: event.id,
    type: event.type,
    category: event.category,
    amount: event.amount,
    currency: event.currency,
    frequency: event.frequency,
    start_date: toDateString(event.start_date),
    end_date: event.end_date ? toDateString(event.end_date) : null,
    event_date: event.event_date ? toDateString(event.event_date) : null,
    account_in: event.account_in ?? null,
    account_out: event.account_out ?? null,
    owner: event.owner,
    confidence: event.confidence,
    source_document_id: event.source_document_id ?? null,
    metadata: event.metadata,
  };
}

export function serializeFinancialState(
  state: FinancialState,
): SerializedFinancialState {
  return {
    user_id: state.user_id,
    current_cash: state.current_cash,
    monthly_income: state.monthly_income,
    balance_source: state.balance_source,
    manual_balances: state.manual_balances,
    partner_a_opening_cash: state.partner_a_opening_cash ?? null,
    partner_b_opening_cash: state.partner_b_opening_cash ?? null,
    events: state.events.map(serializeFinancialEvent),
    computed: state.computed,
  };
}

export function serializeTimeline(
  timeline: FinancialTimelineState[],
): SerializedFinancialTimelineState[] {
  return timeline.map((month) => ({
    month: month.month,
    income_total: month.income_total,
    expense_total: month.expense_total,
    investment_total: month.investment_total,
    net_cash_flow: month.net_cash_flow,
    opening_balance: month.opening_balance,
    closing_balance: month.closing_balance,
    active_events: month.active_events.map(serializeFinancialEvent),
  }));
}
