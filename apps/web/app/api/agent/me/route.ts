import { withAgentHandler } from "@/lib/auth/agent-auth";
import { aiUsageService } from "@/services/usage/ai-usage.service";
import { jsonSuccess } from "@/utils/api-response";

export const runtime = "nodejs";

/** GET — check that an API key works and see today's remaining AI requests. */
export async function GET(request: Request) {
  return withAgentHandler(request, async (userId) => {
    const usage = await aiUsageService.status(userId);
    return jsonSuccess({ authenticated: true, usage });
  });
}
