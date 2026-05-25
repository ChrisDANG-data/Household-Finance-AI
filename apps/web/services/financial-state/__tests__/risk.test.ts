import { describe, expect, it } from "vitest";

import { simulateForecast } from "../projection";
import { computeRiskSignals } from "../risk";
import {
  BASIC_SCENARIO_EVENT_IDS,
  buildBasicScenarioState,
  FORECAST_START_MONTH,
} from "../test-fixtures/basicScenario";

describe("Risk Engine — deterministic risk signals", () => {
  const state = buildBasicScenarioState();
  const timeline = simulateForecast(state, 12, FORECAST_START_MONTH);

  it("returns a complete FinancialRiskReport structure", () => {
    const report = computeRiskSignals(timeline, {
      current_cash: state.current_cash,
      fixed_cost_ratio: state.computed.fixed_cost_ratio,
    });

    expect(["low", "medium", "high"]).toContain(report.risk_level);
    expect(Array.isArray(report.stress_months)).toBe(true);
    expect(Array.isArray(report.warning_events)).toBe(true);
    expect(Array.isArray(report.insights)).toBe(true);
    expect(report.insights.length).toBeGreaterThan(0);
    expect(report.metrics).toMatchObject({
      average_monthly_savings: expect.any(Number),
      worst_month_cash_flow: expect.any(Number),
      cash_flow_volatility: expect.any(Number),
      fixed_cost_ratio: expect.any(Number),
    });
  });

  it("basic scenario has low risk and no stress months", () => {
    const report = computeRiskSignals(timeline, {
      current_cash: state.current_cash,
    });

    expect(report.risk_level).toBe("low");
    expect(report.stress_months).toHaveLength(0);
    expect(report.metrics.average_monthly_savings).toBeGreaterThan(500);
    expect(report.metrics.worst_month_cash_flow).toBe(980);
  });

  it("flags stress months when cash flow is negative", () => {
    const stressedTimeline = timeline.map((m) =>
      m.month === "2026-03"
        ? { ...m, net_cash_flow: -500, income_total: 5000, expense_total: 5500 }
        : m,
    );

    const report = computeRiskSignals(stressedTimeline);
    expect(report.stress_months).toContain("2026-03");
    expect(report.risk_level).not.toBe("low");
    expect(
      report.insights.some((i) => i.includes("Negative cash flow")),
    ).toBe(true);
  });

  it("elevates to high risk with multiple stress months", () => {
    const stressedTimeline = timeline.map((m, i) =>
      i < 3 ? { ...m, net_cash_flow: -200 } : m,
    );

    const report = computeRiskSignals(stressedTimeline);
    expect(report.stress_months.length).toBeGreaterThan(2);
    expect(report.risk_level).toBe("high");
  });

  it("includes renovation in warning events for March stress scenario", () => {
    const marchStress = timeline.map((m) =>
      m.month === "2026-03" ? { ...m, net_cash_flow: -2500 } : m,
    );

    const report = computeRiskSignals(marchStress);
    const warningIds = report.warning_events.map((e) => e.id);
    expect(warningIds).toContain(BASIC_SCENARIO_EVENT_IDS.renovation);
  });

  it("is deterministic across repeated runs", () => {
    const ctx = { current_cash: state.current_cash };
    const a = computeRiskSignals(timeline, ctx);
    const b = computeRiskSignals(timeline, ctx);
    expect(a).toEqual(b);
  });
});
