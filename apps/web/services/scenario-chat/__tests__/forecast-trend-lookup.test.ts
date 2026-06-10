import { describe, expect, it } from "vitest";

import { buildBasicScenarioState } from "@/services/financial-state/test-fixtures/basicScenario";

import {
  isForecastTrendQuestion,
  tryForecastTrendAnswer,
} from "../forecast-trend-lookup";

describe("forecast-trend-lookup", () => {
  it("detects average increase % questions", () => {
    expect(isForecastTrendQuestion("Average increase % over next 3 months?")).toBe(
      true,
    );
    expect(isForecastTrendQuestion("What's my balance trend?")).toBe(false);
  });

  it("computes average MoM increase from ledger forecast", () => {
    const state = buildBasicScenarioState();
    const answer = tryForecastTrendAnswer(
      "Average increase % over next 3 months?",
      state,
      6,
    );

    expect(answer).not.toBeNull();
    expect(answer).toContain("Average month-over-month increase (3 months):");
    expect(answer).toMatch(/[+-]?\d+\.\d{2}%/);
  });
});
