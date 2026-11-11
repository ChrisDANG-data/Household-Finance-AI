import { withAgentHandler } from "@/lib/auth/agent-auth";
import {
  ledgerEventAutomationService,
  type LedgerEventAutomationInput,
} from "@/services/automation/ledger-event.service";
import { jsonSuccess } from "@/utils/api-response";

export const runtime = "nodejs";

/**
 * POST — add income / expense / investment to the API key owner's ledger.
 * Defaults to PREVIEW (nothing saved) unless `confirm: true` is sent,
 * so an agent has to show the user what will be written first.
 */
export async function POST(request: Request) {
  return withAgentHandler(request, async (userId) => {
    const body = (await request.json().catch(() => ({}))) as LedgerEventAutomationInput;
    const result = await ledgerEventAutomationService.handle({
      ...body,
      // Always the key owner — a user_id in the body is ignored on purpose.
      user_id: userId,
      confirm: body?.confirm === true,
    });
    return jsonSuccess(result, { status: result.status === "saved" ? 201 : 200 });
  });
}
