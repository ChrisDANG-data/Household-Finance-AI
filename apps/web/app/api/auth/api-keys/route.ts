import { withAuthenticatedHandler } from "@/lib/api/authenticated-handler";
import { apiKeyService } from "@/services/auth/api-key.service";
import { jsonSuccess } from "@/utils/api-response";

export const runtime = "nodejs";

/** GET — list the signed-in user's active API keys (never returns the key itself). */
export async function GET() {
  return withAuthenticatedHandler(async (userId) => {
    const api_keys = await apiKeyService.list(userId);
    return jsonSuccess({ api_keys });
  });
}

/** POST — create an API key. The full key is returned ONCE in this response. */
export async function POST(request: Request) {
  return withAuthenticatedHandler(async (userId) => {
    const body = (await request.json().catch(() => ({}))) as { name?: unknown };
    const created = await apiKeyService.create(userId, body?.name);
    return jsonSuccess(created, { status: 201 });
  });
}
