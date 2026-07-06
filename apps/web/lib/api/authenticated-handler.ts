import { resolveRequestUserId } from "@/lib/auth/request-user";
import { withApiHandler } from "@/lib/api/route-handler";

export async function withAuthenticatedHandler(
  handler: (userId: string) => Promise<Response>,
): Promise<Response> {
  return withApiHandler(async () => {
    const userId = await resolveRequestUserId();
    return handler(userId);
  });
}
