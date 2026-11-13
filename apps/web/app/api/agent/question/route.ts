import { withAgentHandler } from "@/lib/auth/agent-auth";
import { handleAutomationFinancialQuestion } from "@/services/automation/financial-question.service";
import { aiUsageService } from "@/services/usage/ai-usage.service";
import { jsonSuccess } from "@/utils/api-response";
import { AppError } from "@/utils/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_MESSAGE_LENGTH = 1000;

interface AgentQuestionBody {
  message?: unknown;
  months?: unknown;
}

/**
 * POST — ask a household finance question as the API key's owner.
 * Returns one `reply` string computed by the deterministic engines + advisor.
 */
export async function POST(request: Request) {
  return withAgentHandler(request, async (userId) => {
    const body = (await request.json().catch(() => ({}))) as AgentQuestionBody;
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      throw new AppError("message is required", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new AppError(
        `message must be ${MAX_MESSAGE_LENGTH} characters or fewer`,
        { code: "VALIDATION_ERROR", statusCode: 400 },
      );
    }

    const months = Number(body.months);
    const usage = await aiUsageService.consume(userId);

    const result = await handleAutomationFinancialQuestion({
      message,
      // Always the key owner — a user_id in the body is ignored on purpose.
      user_id: userId,
      months:
        Number.isInteger(months) && months >= 1 && months <= 12 ? months : undefined,
    });

    return jsonSuccess({ ...result, usage });
  });
}
