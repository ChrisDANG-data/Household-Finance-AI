import { handleScenarioMessage } from "@/services/scenario-chat";
import { financialStateEngine } from "@/services/financial-state";
import {
  DEFAULT_USER_ID,
  financialStatePersistence,
} from "@/services/financial-state/financial-state.persistence";
import { AppError } from "@/utils/errors";

export interface FinancialQuestionAutomationInput {
  message: string;
  user_id?: string;
  months?: number;
  forecast_start_month?: string;
  use_llm?: boolean;
  ai_provider?: "claude" | "gemini";
}

export interface FinancialQuestionAutomationResult {
  reply: string;
  route: string;
}

export async function handleAutomationFinancialQuestion(
  input: FinancialQuestionAutomationInput,
): Promise<FinancialQuestionAutomationResult> {
  const message = input.message?.trim();
  if (!message) {
    throw new AppError("message is required", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  const userId = input.user_id?.trim() || DEFAULT_USER_ID;
  const persisted = await financialStatePersistence.loadState(
    userId,
    input.forecast_start_month,
  );

  const financial_state =
    persisted.events.length > 0 || persisted.current_cash > 0
      ? persisted
      : financialStateEngine.createState({
          user_id: userId,
          current_cash: persisted.current_cash,
          events: [],
          referenceMonth: input.forecast_start_month,
        });

  const response = await handleScenarioMessage({
    message,
    user_id: userId,
    financial_state,
    months: input.months ?? 6,
    forecast_start_month: input.forecast_start_month,
    use_llm: input.use_llm ?? true,
    ai_provider: input.ai_provider,
  });

  const reply =
    response.writer_summary?.trim() ||
    response.explanation?.trim() ||
    response.financial_summary?.trim() ||
    "No answer available.";

  return {
    reply,
    route: response.orchestrator_route ?? "advisor",
  };
}
