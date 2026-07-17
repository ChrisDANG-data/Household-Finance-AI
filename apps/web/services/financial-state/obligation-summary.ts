import type { DbFinancialObligation } from "@/lib/prisma-types";

import { currentUtcMonth } from "./dates";
import { obligationToFinancialEvent } from "./obligation.mapper";
import { projectMonth } from "./projection";
import type { FinancialState } from "./state.types";

export interface MonthlyObligationSummary {
  month: string;
  total_monthly_obligations: number;
  obligation_count: number;
  active_obligation_ids: string[];
}

export function computeMonthlyObligationSummary(
  obligations: DbFinancialObligation[],
  month: string = currentUtcMonth(),
): MonthlyObligationSummary {
  const events = obligations.map(obligationToFinancialEvent);
  const state: FinancialState = {
    user_id: "mvp",
    current_cash: 0,
    monthly_income: 0,
    balance_source: "manual",
    manual_balances: {
      checking: 0,
      savings: 0,
      cash_management: 0,
      investment: 0,
      credit_owed: 0,
    },
    events,
    computed: {
      monthly_net_cash_flow: 0,
      burn_rate: 0,
      runway_months: null,
      fixed_cost_ratio: 0,
    },
  };

  const timeline = projectMonth(state, month);

  return {
    month,
    total_monthly_obligations: timeline.expense_total,
    obligation_count: obligations.length,
    active_obligation_ids: timeline.active_events.map((e) => e.id),
  };
}
