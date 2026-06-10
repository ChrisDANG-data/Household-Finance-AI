import type { FinancialAdviceResponse } from "@/services/ai/advisor/types";
import type { AiProvider } from "@/services/ai/llm/types";
import type { FinancialRiskReport } from "@/services/financial-state/risk";
import type { FinancialState } from "@/services/financial-state/state.types";
import type { FinancialTimelineState } from "@/services/financial-state/state.types";
import type { CashFlowRiskLevel } from "@/services/financial-state/state.types";

export type ScenarioIntent =
  | "affordability_check"
  | "what_if_simulation"
  | "explanation_request"
  | "general_finance_question";

export type OrchestratorRoute =
  | "deterministic_ledger"
  | "langgraph"
  | "ledger_llm"
  | "advisor";

export type ScenarioModification =
  | "increase_income"
  | "decrease_income"
  | "increase_expense"
  | "decrease_expense"
  | "add_one_time_expense"
  | "add_recurring_expense"
  | "add_one_time_investment";

export interface ScenarioParameters {
  amount?: number;
  target_month?: string;
  event_type?: string;
  modification?: ScenarioModification;
  percent_change?: number;
  description?: string;
}

export interface ParsedScenarioMessage {
  intent: ScenarioIntent;
  parameters: ScenarioParameters;
  raw_message: string;
}

export interface ScenarioChatResponse {
  intent: ScenarioIntent;
  interpretation: string;
  financial_summary: string;
  risk_level: CashFlowRiskLevel;
  explanation: string;
  recommendation: string;
  /** Which orchestration path produced this answer (hybrid routing). */
  orchestrator_route?: OrchestratorRoute;
  /** LangGraph specialists that contributed (when route is langgraph). */
  agents_used?: string[];
  /** LLM narration of specialist output (numbers unchanged; optional). */
  writer_summary?: string;
  /** Deterministic specialist sections (composer output). */
  detail_answer?: string;
  structured_data: {
    timeline: FinancialTimelineState[];
    risk: FinancialRiskReport;
    baseline_timeline?: FinancialTimelineState[];
    baseline_risk?: FinancialRiskReport;
    advice?: FinancialAdviceResponse;
  };
}

export interface HandleScenarioMessageInput {
  message: string;
  user_id: string;
  financial_state: FinancialState;
  /** Forecast horizon (default 12) */
  months?: number;
  forecast_start_month?: string;
  use_llm?: boolean;
  ai_provider?: AiProvider;
  /** auto = hybrid router; cost | investment | payments = single LangGraph specialist */
  analyst_mode?: "auto" | "cost" | "investment" | "payments";
  /** false = skip LangGraph; true/undefined = hybrid routing when service is enabled */
  langgraph_enabled?: boolean;
}
