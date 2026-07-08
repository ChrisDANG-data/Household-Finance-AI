import { describe, expect, it } from "vitest";

import {
  buildBasicScenarioState,
  FORECAST_START_MONTH,
} from "@/services/financial-state/test-fixtures/basicScenario";

import {
  extractMonthRange,
  extractTargetYear,
  isPeriodAggregationQuery,
  tryDeterministicPeriodAnswer,
} from "../period-lookup";

describe("period-lookup", () => {
  const state = buildBasicScenarioState();

  it("detects full-year aggregation queries", () => {
    expect(isPeriodAggregationQuery("total income in 2026?")).toBe(true);
    expect(isPeriodAggregationQuery("total expenses in 2026")).toBe(true);
    expect(isPeriodAggregationQuery("income in July 2026")).toBe(false);
  });

  it("detects month-range aggregation queries", () => {
    expect(
      isPeriodAggregationQuery(
        "total expenses from July 2026 to October 2026",
      ),
    ).toBe(true);
    expect(extractMonthRange("from July 2026 to October 2026")).toEqual({
      start: "2026-07",
      end: "2026-10",
    });
  });

  it("extracts target year", () => {
    expect(extractTargetYear("total income in 2026")).toBe("2026");
  });

  it("sums income across 2026 with monthly breakdown", async () => {
    const answer = await tryDeterministicPeriodAnswer("total income in 2026?", {
      state,
      startMonth: FORECAST_START_MONTH,
    });
    expect(answer).toMatch(/Total income in 2026/i);
    expect(answer).toMatch(/January 2026/);
    expect(answer).toMatch(/December 2026/);
    expect(answer).toMatch(/\$[\d,]+\.\d{2}/);
  });

  it("sums expenses across a month range", async () => {
    const answer = await tryDeterministicPeriodAnswer(
      "total expenses from July 2026 to October 2026",
      { state, startMonth: FORECAST_START_MONTH },
    );
    expect(answer).toMatch(/Total expenses in July 2026 to October 2026/i);
    expect(answer).toMatch(/July 2026/);
    expect(answer).toMatch(/August 2026/);
    expect(answer).toMatch(/September 2026/);
    expect(answer).toMatch(/October 2026/);
    expect(answer).not.toMatch(/November 2026/);
  });
});
