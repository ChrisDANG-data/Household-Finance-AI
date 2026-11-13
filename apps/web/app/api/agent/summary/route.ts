import { withAgentHandler } from "@/lib/auth/agent-auth";
import { monthlySummaryService } from "@/services/automation/monthly-summary.service";
import { jsonSuccess } from "@/utils/api-response";

export const runtime = "nodejs";

/**
 * GET — deterministic monthly summary for the API key's owner (no AI call).
 * Query: month (YYYY-MM, default = previous UTC month).
 */
export async function GET(request: Request) {
  return withAgentHandler(request, async (userId) => {
    const month = new URL(request.url).searchParams.get("month");
    const result = await monthlySummaryService.build(userId, month);
    return jsonSuccess({
      month: result.month,
      label: result.label,
      text: result.body,
      summary: result.summary,
    });
  });
}
