import { FORECAST_START_MONTH } from "@/services/financial-state/test-fixtures/basicScenario";
import type { RawFinancialEvent } from "@/types/financial-state";

/** Demo household payload for scenario chat UI (matches test fixture). */
export const DEMO_USER_ID = "demo-household-001";

export const DEMO_FINANCIAL_CONTEXT = {
  user_id: DEMO_USER_ID,
  current_cash: 10_000,
  monthly_income: 5000,
  forecast_start_month: FORECAST_START_MONTH,
  events: [
    {
      id: "evt-income-salary",
      type: "income",
      category: "salary",
      amount: 5000,
      currency: "CAD",
      frequency: "monthly",
      start_date: "2026-01-01",
      confidence: 1,
      metadata: { contract_name: "Employer", is_fixed: true },
    },
    {
      id: "evt-rent",
      type: "recurring_expense",
      category: "rent",
      amount: 1500,
      currency: "CAD",
      frequency: "monthly",
      start_date: "2026-01-01",
      metadata: { merchant: "Landlord", is_fixed: true },
    },
    {
      id: "evt-insurance",
      type: "recurring_expense",
      category: "insurance",
      amount: 120,
      currency: "CAD",
      frequency: "monthly",
      start_date: "2026-01-01",
      metadata: { is_fixed: true },
    },
    {
      id: "evt-car-lease",
      type: "recurring_expense",
      category: "car_lease",
      amount: 400,
      currency: "CAD",
      frequency: "monthly",
      start_date: "2026-01-01",
      end_date: "2026-06-30",
      metadata: { contract_name: "Auto Lease", is_fixed: true },
    },
    {
      id: "evt-renovation",
      type: "one_time_expense",
      category: "renovation",
      amount: 2000,
      currency: "CAD",
      frequency: "one_time",
      start_date: "2026-03-15",
      metadata: { merchant: "Contractor" },
    },
  ] satisfies RawFinancialEvent[],
};
