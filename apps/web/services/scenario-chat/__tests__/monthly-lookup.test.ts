import { describe, expect, it } from "vitest";

import {
  buildBasicScenarioState,
  FORECAST_START_MONTH,
} from "@/services/financial-state/test-fixtures/basicScenario";

import {
  extractTargetMonth,
  isSimpleMonthForecastQuery,
  monthLabel,
  tryDeterministicMonthAnswer,
} from "../monthly-lookup";

describe("monthly-lookup", () => {
  const state = buildBasicScenarioState();

  it("extracts July from income question", () => {
    const month = extractTargetMonth("what is the income in July");
    expect(month).toMatch(/-07$/);
    expect(monthLabel(month!)).toMatch(/July/);
  });

  it("extracts July 2026 explicitly", () => {
    expect(extractTargetMonth("income in July 2026")).toBe("2026-07");
  });

  it("detects simple month forecast queries", () => {
    expect(isSimpleMonthForecastQuery("What is my closing balance in July?")).toBe(
      true,
    );
    expect(isSimpleMonthForecastQuery("What is my net cash flow in July?")).toBe(
      true,
    );
    expect(isSimpleMonthForecastQuery("Can I afford $500/month car payment?")).toBe(
      false,
    );
  });

  it("answers July income from ledger", async () => {
    const answer = await tryDeterministicMonthAnswer("What is my income in July?", {
      state,
      startMonth: FORECAST_START_MONTH,
    });
    expect(answer).toMatch(/Total income in July 2026/i);
    expect(answer).toMatch(/\$[\d,]+\.\d{2}/);
  });

  it("answers July net cash flow from ledger", async () => {
    const answer = await tryDeterministicMonthAnswer(
      "What is my net cash flow in July?",
      { state, startMonth: FORECAST_START_MONTH },
    );
    expect(answer).toMatch(/Total net cash flow in July 2026/i);
  });

  it("answers July closing balance from forecast", async () => {
    const answer = await tryDeterministicMonthAnswer(
      "What is my closing balance in July?",
      { state, startMonth: FORECAST_START_MONTH, forecastMonths: 12 },
    );
    expect(answer).toMatch(/Closing balance in July 2026/i);
    expect(answer).toMatch(/\$[\d,]+\.\d{2}/);
  });
});
