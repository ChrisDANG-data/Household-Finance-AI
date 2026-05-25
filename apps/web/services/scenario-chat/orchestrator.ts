import { generateFinancialAdvice } from "@/services/ai/advisor";
import { currentUtcMonth } from "@/services/financial-state/dates";
import { computeRiskSignals } from "@/services/financial-state/risk";
import { simulateForecast } from "@/services/financial-state/projection";
import type { FinancialState } from "@/services/financial-state/state.types";

import { parseScenarioMessage } from "./intent-parser";
import { applyScenarioToState } from "./scenario-builder";
import type {
  HandleScenarioMessageInput,
  ScenarioChatResponse,
  ScenarioIntent,
  ScenarioParameters,
} from "./types";

const FORECAST_MONTHS_DEFAULT = 12;

function buildInterpretation(
  intent: ScenarioIntent,
  hasScenario: boolean,
  params: ScenarioParameters,
): string {
  switch (intent) {
    case "affordability_check":
      return params.amount
        ? `Affordability check: one-time expense of ${params.amount} CAD${
            params.target_month ? ` in ${params.target_month}` : ""
          } was simulated against your forecast.`
        : "Affordability check requested; add an amount for a precise simulation.";
    case "what_if_simulation":
      return hasScenario
        ? "What-if scenario applied to your financial model; forecast and risk were recomputed."
        : "What-if question received; baseline forecast used (no parameter changes detected).";
    case "explanation_request":
      return "Explanation based on existing forecast and risk analysis (no re-simulation required).";
    case "general_finance_question":
    default:
      return hasScenario
        ? "General financial question with scenario adjustments applied."
        : "General financial overview from your current forecast and risk profile.";
  }
}

function runEngines(
  state: FinancialState,
  months: number,
  startMonth?: string,
) {
  const start = startMonth ?? currentUtcMonth();
  const timeline = simulateForecast(state, months, start);
  const risk = computeRiskSignals(timeline, {
    current_cash: state.current_cash,
    fixed_cost_ratio: state.computed.fixed_cost_ratio,
  });
  return { timeline, risk };
}

/**
 * Orchestrates intent parsing, deterministic engines, and AI advisor explanations.
 */
export async function handleScenarioMessage(
  input: HandleScenarioMessageInput,
): Promise<ScenarioChatResponse> {
  const parsed = parseScenarioMessage(input.message);
  const months = input.months ?? FORECAST_MONTHS_DEFAULT;
  const startMonth = input.forecast_start_month;

  const baseline = runEngines(input.financial_state, months, startMonth);

  const scenarioState = applyScenarioToState(
    input.financial_state,
    parsed.parameters,
    parsed.intent,
  );

  const useScenario =
    scenarioState !== null &&
    parsed.intent !== "explanation_request";

  const activeState = useScenario ? scenarioState : input.financial_state;
  const { timeline, risk } = useScenario
    ? runEngines(scenarioState!, months, startMonth)
    : baseline;

  const advice = await generateFinancialAdvice(
    {
      state: activeState,
      timeline,
      risk,
      user_query: input.message,
    },
    { useLlm: input.use_llm !== false },
  );

  const interpretation = buildInterpretation(
    parsed.intent,
    useScenario,
    parsed.parameters,
  );

  return {
    intent: parsed.intent,
    interpretation,
    financial_summary: advice.summary,
    risk_level: risk.risk_level,
    explanation: advice.explanation,
    recommendation:
      advice.recommendations[0] ??
      advice.key_insights[0] ??
      "Review your forecast timeline for month-by-month details.",
    structured_data: {
      timeline,
      risk,
      baseline_timeline: useScenario ? baseline.timeline : undefined,
      baseline_risk: useScenario ? baseline.risk : undefined,
      advice,
    },
  };
}
