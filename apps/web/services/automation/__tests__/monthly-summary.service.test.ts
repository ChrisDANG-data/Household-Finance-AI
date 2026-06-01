import { describe, expect, it, vi } from "vitest";

import { MonthlySummaryService } from "../monthly-summary.service";

vi.mock("@/services/financial-state/financial-state.persistence", () => ({
  DEFAULT_USER_ID: "default",
  financialStatePersistence: {
    loadState: vi.fn(async () => ({
      user_id: "default",
      current_cash: 10000,
      monthly_income: 4400,
      events: [],
      computed: {
        monthly_net_cash_flow: 0,
        burn_rate: 0,
        runway_months: null,
        fixed_cost_ratio: 0,
      },
    })),
  },
}));

vi.mock("@/services/financial-state/projection", () => ({
  simulateForecast: vi.fn(() => [
    {
      month: "2026-05",
      income_total: 9100,
      expense_total: 3078,
      investment_total: 500,
      net_cash_flow: 5522,
      opening_balance: 79772,
      closing_balance: 85294,
      active_events: [],
    },
  ]),
}));

vi.mock("@/lib/serialize-scenario-response", () => ({
  serializeTimeline: vi.fn((timeline) =>
    timeline.map((m: { month: string; income_total: number; expense_total: number; investment_total: number; net_cash_flow: number; opening_balance: number; closing_balance: number }) => ({
      month: m.month,
      income_total: m.income_total,
      expense_total: m.expense_total,
      investment_total: m.investment_total,
      net_cash_flow: m.net_cash_flow,
      opening_balance: m.opening_balance,
      closing_balance: m.closing_balance,
      income_by_category: { salary: 7900, rent: 1200 },
      expense_by_category: { grocery: 1800 },
      investment_by_category: { tfsa: 300 },
      income_lines: [],
      expense_lines: [],
      investment_lines: [],
      active_event_ids: [],
      active_event_categories: [],
    })),
  ),
}));

describe("MonthlySummaryService", () => {
  const service = new MonthlySummaryService();

  it("builds subject and body for a given month", async () => {
    const result = await service.build("default", "2026-05");

    expect(result.month).toBe("2026-05");
    expect(result.label).toBe("May 2026");
    expect(result.subject).toContain("May 2026");
    expect(result.subject).toContain("Net");
    expect(result.body).toContain("Opening balance");
    expect(result.body).toContain("salary");
    expect(result.summary.net_cash_flow).toBe(5522);
  });
});
