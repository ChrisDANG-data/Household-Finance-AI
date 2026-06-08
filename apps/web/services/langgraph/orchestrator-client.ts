import { env } from "@/lib/env";
import type { FinancialState } from "@/services/financial-state/state.types";
import type { AiProvider } from "@/services/ai/llm/types";

export type AnalystMode = "auto" | "cost" | "investment" | "payments";

export interface LangGraphOrchestrateInput {
  message: string;
  user_id: string;
  financial_state: FinancialState;
  months?: number;
  forecast_start_month?: string;
  ai_provider?: AiProvider;
  analyst_mode?: AnalystMode;
}

export interface LangGraphOrchestrateOutput {
  answer: string;
  recommendation: string;
  intent:
    | "affordability_check"
    | "what_if_simulation"
    | "explanation_request"
    | "general_finance_question";
  confidence: number;
  agents_used: string[];
}

export async function orchestrateWithLangGraph(
  input: LangGraphOrchestrateInput,
): Promise<LangGraphOrchestrateOutput | null> {
  const baseUrl = env.langgraph.orchestratorUrl();
  if (!env.langgraph.enabled() || !baseUrl) return null;

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/orchestrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: input.message,
        user_id: input.user_id,
        months: input.months ?? 12,
        forecast_start_month: input.forecast_start_month,
        ai_provider: input.ai_provider,
        analyst_mode: input.analyst_mode ?? "auto",
        financial_state: input.financial_state,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as Partial<LangGraphOrchestrateOutput>;
    if (!data.answer || !data.intent) return null;
    return {
      answer: data.answer,
      recommendation:
        data.recommendation ??
        "Review your deterministic forecast and risk summary for details.",
      intent: data.intent,
      confidence:
        typeof data.confidence === "number" ? data.confidence : 0.6,
      agents_used: Array.isArray(data.agents_used) ? data.agents_used : [],
    };
  } catch {
    return null;
  }
}
