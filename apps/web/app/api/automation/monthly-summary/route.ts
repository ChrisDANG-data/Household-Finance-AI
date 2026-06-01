import { assertAutomationBearer } from "@/services/automation/webhook-auth";
import { monthlySummaryService } from "@/services/automation/monthly-summary.service";
import { DEFAULT_USER_ID } from "@/services/financial-state/financial-state.persistence";
import { jsonError, jsonSuccess } from "@/utils/api-response";
import { toAppError } from "@/utils/errors";

/**
 * GET — email-ready monthly financial summary for automation (n8n + Gmail).
 * Query: user_id (default), month (YYYY-MM, default = previous UTC month).
 */
export async function GET(request: Request) {
  try {
    assertAutomationBearer(request);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id") ?? DEFAULT_USER_ID;
    const month = searchParams.get("month");

    const result = await monthlySummaryService.build(userId, month);
    return jsonSuccess(result);
  } catch (error) {
    return jsonError(toAppError(error));
  }
}
