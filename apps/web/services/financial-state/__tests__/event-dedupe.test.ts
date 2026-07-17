import { describe, expect, it } from "vitest";

import {
  dedupeExactFinancialEvents,
  dedupeFinancialEventsForProjection,
  findExactDuplicate,
  findRecurringStreamDuplicate,
} from "@/services/financial-state/event-dedupe";
import { projectMonth } from "@/services/financial-state/projection";
import type { FinancialEvent } from "@/services/financial-state/types";

function incomeEvent(
  id: string,
  amount: number,
  start: string,
  owner: FinancialEvent["owner"] = "partner_a",
): FinancialEvent {
  return {
    id,
    type: "income",
    category: "salary",
    amount,
    currency: "CAD",
    frequency: "monthly",
    start_date: new Date(`${start}T00:00:00.000Z`),
    owner,
    confidence: 1,
    metadata: { is_fixed: false },
  };
}

describe("event-dedupe", () => {
  it("removes exact duplicate rows", () => {
    const events = [
      incomeEvent("a", 5200, "2025-05-14"),
      incomeEvent("b", 5200, "2025-05-14"),
    ];
    expect(dedupeExactFinancialEvents(events)).toHaveLength(1);
  });

  it("keeps latest recurring stream per type/category/owner/amount", () => {
    const events = [
      incomeEvent("old", 5200, "2023-10-01"),
      incomeEvent("mid", 5200, "2025-05-14"),
      incomeEvent("new", 5200, "2026-06-04"),
      incomeEvent("bonus", 2000, "2026-06-01"),
      incomeEvent("b1", 1000, "2026-06-03", "partner_b"),
      incomeEvent("b2", 1000, "2026-06-05", "partner_b"),
    ];

    const deduped = dedupeFinancialEventsForProjection(events);
    expect(deduped).toHaveLength(3);

    const state = {
      user_id: "default",
      current_cash: 0,
      monthly_income: 0,
      balance_source: "manual" as const,
      manual_balances: {
        checking: 0,
        savings: 0,
        cash_management: 0,
        investment: 0,
        credit_owed: 0,
      },
      events: deduped,
      computed: {
        monthly_net_cash_flow: 0,
        burn_rate: 0,
        runway_months: null,
        fixed_cost_ratio: 0,
      },
    };

    const july = projectMonth(state, "2026-07", 0);
    expect(july.income_total).toBe(8200);
  });

  it("findExactDuplicate detects identical rows", () => {
    const a = incomeEvent("a", 5200, "2025-05-14");
    const b = incomeEvent("b", 5200, "2025-05-14");
    expect(findExactDuplicate(b, [a])?.id).toBe("a");
  });

  it("findRecurringStreamDuplicate detects same salary stream", () => {
    const old = incomeEvent("old", 5200, "2023-10-01");
    const newer = incomeEvent("new", 5200, "2026-06-04");
    expect(findRecurringStreamDuplicate(newer, [old])?.id).toBe("old");
  });
});
