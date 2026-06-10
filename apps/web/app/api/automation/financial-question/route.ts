import { assertAutomationBearer } from "@/services/automation/webhook-auth";
import {
  handleAutomationFinancialQuestion,
  type FinancialQuestionAutomationInput,
} from "@/services/automation/financial-question.service";
import { jsonError, jsonSuccess } from "@/utils/api-response";
import { toAppError } from "@/utils/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST — Telegram / n8n financial Q&A.
 * Returns a single `reply` string (no timeline JSON) so the agent does not recompute totals.
 */
export async function POST(request: Request) {
  try {
    assertAutomationBearer(request);
    const body = (await request.json()) as FinancialQuestionAutomationInput;
    const result = await handleAutomationFinancialQuestion(body);
    return jsonSuccess(result);
  } catch (error) {
    return jsonError(toAppError(error));
  }
}
