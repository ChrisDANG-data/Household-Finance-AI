import { withAuthenticatedHandler } from "@/lib/api/authenticated-handler";
import { apiKeyService } from "@/services/auth/api-key.service";
import { jsonSuccess } from "@/utils/api-response";

export const runtime = "nodejs";

/** DELETE — revoke one of the signed-in user's API keys. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withAuthenticatedHandler(async (userId) => {
    const { id } = await context.params;
    await apiKeyService.revoke(userId, id);
    return jsonSuccess({ revoked: true });
  });
}
