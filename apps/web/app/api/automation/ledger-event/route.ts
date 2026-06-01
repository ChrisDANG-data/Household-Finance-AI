import { assertAutomationBearer } from "@/services/automation/webhook-auth";
import {
  ledgerEventAutomationService,
  type LedgerEventAutomationInput,
} from "@/services/automation/ledger-event.service";
import { jsonError, jsonSuccess } from "@/utils/api-response";
import { toAppError } from "@/utils/errors";

/**
 * POST — add income / expense / investment from automation (n8n, Telegram).
 * Simpler schema than /api/financial-state/events.
 * Default: preview only (confirm=false). Set confirm=true to persist.
 */
export async function POST(request: Request) {
  try {
    assertAutomationBearer(request);
    const body = (await request.json()) as LedgerEventAutomationInput;
    const result = await ledgerEventAutomationService.handle(body);
    const status = result.status === "saved" ? 201 : 200;
    return jsonSuccess(result, { status });
  } catch (error) {
    return jsonError(toAppError(error));
  }
}
