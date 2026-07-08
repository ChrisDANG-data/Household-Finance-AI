import type { FinancialEvent } from "./types";

/** Derived metrics attached to a FinancialState (computed, not stored). */
export interface FinancialStateComputed {
  monthly_net_cash_flow: number;
  burn_rate: number;
  runway_months: number | null;
  fixed_cost_ratio: number;
}

export type BalanceSource = "plaid" | "manual";

export interface ManualAccountBalances {
  checking: number;
  savings: number;
  cash_management: number;
  investment: number;
  credit_owed: number;
}

export interface FinancialState {
  user_id: string;
  current_cash: number;
  monthly_income: number;
  balance_source: BalanceSource;
  manual_balances: ManualAccountBalances;
  /** Optional manual partner opening balances (sum should match current_cash). */
  partner_a_opening_cash?: number | null;
  partner_b_opening_cash?: number | null;
  events: FinancialEvent[];
  computed: FinancialStateComputed;
}

export interface PartnerBalanceSlice {
  opening_balance: number;
  closing_balance: number;
  net_cash_flow: number;
  income_total: number;
  expense_total: number;
  investment_total: number;
}

export interface PartnerBalances {
  partner_a: PartnerBalanceSlice;
  partner_b: PartnerBalanceSlice;
}

export interface FinancialTimelineState {
  month: string;
  income_total: number;
  expense_total: number;
  investment_total: number;
  net_cash_flow: number;
  opening_balance: number;
  closing_balance: number;
  active_events: FinancialEvent[];
  /** Per-partner rolling balances (joint cash split 50/50 at forecast start). */
  partner_balances?: PartnerBalances;
}

export type CashFlowRiskLevel = "low" | "medium" | "high";

export interface SimulateForecastOptions {
  months?: number;
  startMonth?: string;
}
