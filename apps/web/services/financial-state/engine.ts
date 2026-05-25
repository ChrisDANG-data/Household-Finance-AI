import { currentUtcMonth } from "./dates";
import { normalizeFinancialEvents } from "./normalize";
import { buildFinancialState, computeDerivedFields } from "./projection";
import { computeRiskSignals } from "./risk";
import { projectMonth, simulateForecast } from "./projection";
import type {
  FinancialRiskReport,
  RiskAnalysisContext,
} from "./risk";
import type {
  FinancialState,
  FinancialTimelineState,
  SimulateForecastOptions,
} from "./state.types";
import type { FinancialEvent, RawFinancialEvent } from "./types";

export interface CreateStateInput {
  user_id: string;
  current_cash: number;
  monthly_income?: number;
  events: RawFinancialEvent[];
  referenceMonth?: string;
}

/**
 * Deterministic Financial State Engine — canonical in-memory financial model.
 * No AI, no database, no external APIs.
 */
export class FinancialStateEngine {
  normalizeFinancialEvents(input: RawFinancialEvent[]): FinancialEvent[] {
    return normalizeFinancialEvents(input);
  }

  /** @deprecated Use normalizeFinancialEvents */
  normalizeEvents(input: RawFinancialEvent[]): FinancialEvent[] {
    return normalizeFinancialEvents(input);
  }

  createState(input: CreateStateInput): FinancialState {
    const events = normalizeFinancialEvents(input.events);
    const referenceMonth = input.referenceMonth ?? currentUtcMonth();
    const base = {
      user_id: input.user_id,
      current_cash: input.current_cash,
      monthly_income: input.monthly_income ?? 0,
      events,
    };
    return buildFinancialState(base, referenceMonth);
  }

  computeDerivedFields(
    state: Pick<FinancialState, "current_cash" | "monthly_income" | "events">,
    referenceMonth?: string,
  ): FinancialState["computed"] {
    return computeDerivedFields(state, referenceMonth ?? currentUtcMonth());
  }

  withComputed(
    state: Omit<FinancialState, "computed">,
    referenceMonth?: string,
  ): FinancialState {
    return buildFinancialState(
      state as FinancialState,
      referenceMonth ?? currentUtcMonth(),
    );
  }

  projectMonth(state: FinancialState, month: string): FinancialTimelineState {
    return projectMonth(state, month);
  }

  simulateForecast(
    state: FinancialState,
    monthsOrOptions: number | SimulateForecastOptions = 12,
  ): FinancialTimelineState[] {
    if (typeof monthsOrOptions === "number") {
      return simulateForecast(state, monthsOrOptions);
    }
    return simulateForecast(
      state,
      monthsOrOptions.months ?? 12,
      monthsOrOptions.startMonth,
    );
  }

  computeRiskSignals(
    timeline: FinancialTimelineState[],
    context?: RiskAnalysisContext,
  ): FinancialRiskReport {
    return computeRiskSignals(timeline, {
      current_cash: context?.current_cash,
      fixed_cost_ratio: context?.fixed_cost_ratio,
    });
  }

  analyzeRisk(
    state: FinancialState,
    timeline: FinancialTimelineState[],
  ): FinancialRiskReport {
    return computeRiskSignals(timeline, {
      current_cash: state.current_cash,
      fixed_cost_ratio: state.computed.fixed_cost_ratio,
    });
  }

  buildSnapshot(
    input: CreateStateInput,
    forecastOptions?: SimulateForecastOptions,
  ): {
    state: FinancialState;
    timeline: FinancialTimelineState[];
    risk: FinancialRiskReport;
  } {
    const state = this.createState(input);
    const timeline = this.simulateForecast(state, {
      months: 12,
      ...forecastOptions,
    });
    const risk = this.analyzeRisk(state, timeline);
    return { state, timeline, risk };
  }
}

export const financialStateEngine = new FinancialStateEngine();
