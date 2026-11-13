import { withApiHandler } from "@/lib/api/route-handler";
import { apiKeyService, readBearerApiKey } from "@/services/auth/api-key.service";
import { AppError } from "@/utils/errors";

/**
 * Resolve the user behind an agent request from its per-user API key.
 * The user id ALWAYS comes from the key — never from the request body or query.
 */
export async function resolveAgentUserId(request: Request): Promise<string> {
  const verified = await apiKeyService.verify(readBearerApiKey(request));
  if (!verified) {
    throw new AppError(
      "Invalid or missing API key. Send 'Authorization: Bearer hfi_...'",
      { code: "UNAUTHORIZED", statusCode: 401 },
    );
  }
  return verified.userId;
}

export async function withAgentHandler(
  request: Request,
  handler: (userId: string) => Promise<Response>,
): Promise<Response> {
  return withApiHandler(async () => {
    const userId = await resolveAgentUserId(request);
    return handler(userId);
  });
}
