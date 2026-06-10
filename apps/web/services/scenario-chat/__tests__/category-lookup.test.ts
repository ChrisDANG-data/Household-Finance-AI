import { describe, expect, it, vi, beforeEach } from "vitest";

import type { FinancialEvent } from "@/services/financial-state/types";

import { tryCategoryCoverageAnswer } from "../category-lookup";

const mockLoadState = vi.fn();

vi.mock("@/services/financial-state/financial-state.persistence", () => ({
  DEFAULT_USER_ID: "default",
  financialStatePersistence: {
    loadState: (...args: unknown[]) => mockLoadState(...args),
  },
}));

function carInsuranceEvents(): FinancialEvent[] {
  return [
    {
      id: "1",
      type: "one_time_expense",
      category: "car_insurance",
      amount: 200,
      currency: "CAD",
      frequency: "one_time",
      start_date: new Date("2026-06-26T00:00:00.000Z"),
      end_date: new Date("2026-06-26T00:00:00.000Z"),
      owner: "joint",
      confidence: 1,
      metadata: {},
    },
    {
      id: "2",
      type: "one_time_expense",
      category: "car_insurance",
      amount: 200,
      currency: "CAD",
      frequency: "one_time",
      start_date: new Date("2026-10-26T00:00:00.000Z"),
      end_date: new Date("2026-10-26T00:00:00.000Z"),
      owner: "joint",
      confidence: 1,
      metadata: {},
    },
  ];
}

describe("tryCategoryCoverageAnswer", () => {
  beforeEach(() => {
    mockLoadState.mockReset();
  });

  it("returns October as last month for car insurance contract", async () => {
    mockLoadState.mockResolvedValue({
      user_id: "default",
      current_cash: 0,
      events: carInsuranceEvents(),
      computed: {},
    });

    const answer = await tryCategoryCoverageAnswer(
      "what is the last month of car insurance",
    );

    expect(answer).toContain("October 2026");
    expect(answer).toContain("2026-10-26");
  });

  it("returns null for unrelated questions", async () => {
    mockLoadState.mockResolvedValue({
      user_id: "default",
      current_cash: 0,
      events: carInsuranceEvents(),
      computed: {},
    });

    expect(
      await tryCategoryCoverageAnswer("Total expenses in June 2026"),
    ).toBeNull();
  });
});
