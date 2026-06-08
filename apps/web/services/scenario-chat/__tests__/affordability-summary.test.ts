import { describe, expect, it } from "vitest";

import { buildBasicScenarioState } from "@/services/financial-state/test-fixtures/basicScenario";
import { computeRiskSignals } from "@/services/financial-state/risk";
import { simulateForecast } from "@/services/financial-state/projection";

import {
  buildAffordabilitySummary,
  parseMonthlyAmount,
  trimToAffordabilitySummary,
} from "../affordability-summary";

describe("affordability-summary", () => {
  it("parses 500$/month", () => {
    expect(
      parseMonthlyAmount("Can I afford another 500$/month car lease payment?"),
    ).toBe(500);
  });

  it("strips specialist sections after affordability summary", () => {
    const raw = `### Affordability summary
- Verdict: Yes

### Cost analyst
lots of detail

### Payment planner
more detail`;

    const trimmed = trimToAffordabilitySummary(raw);
    expect(trimmed).toContain("Affordability summary");
    expect(trimmed).not.toContain("Cost analyst");
    expect(trimmed).not.toContain("Payment planner");
  });

  it("builds summary with verdict", () => {
    const state = buildBasicScenarioState();
    const timeline = simulateForecast(state, 12, "2026-06");
    const risk = computeRiskSignals(timeline, {
      current_cash: state.current_cash,
      fixed_cost_ratio: state.computed.fixed_cost_ratio,
    });

    const summary = buildAffordabilitySummary(
      "Can I afford another 500$/month car lease payment?",
      state,
      risk,
    );

    expect(summary).toContain("### Affordability summary");
    expect(summary).toContain("$500.00");
    expect(summary).toContain("Verdict:");
  });
});
