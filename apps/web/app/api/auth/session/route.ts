import { withApiHandler } from "@/lib/api/route-handler";
import { isAuthEnabled } from "@/lib/auth/config";
import { env } from "@/lib/env";
import { readValidSession } from "@/lib/auth/request-user";
import { jsonSuccess } from "@/utils/api-response";
import { userAuthService } from "@/services/auth/user-auth.service";

export async function GET() {
  return withApiHandler(async () => {
    const authEnabled = isAuthEnabled();
    // Also false when the account was deleted or its password changed since sign-in.
    const payload = authEnabled ? await readValidSession() : null;

    const userCount = authEnabled ? await userAuthService.countUsers() : 0;

    return jsonSuccess({
      authEnabled,
      authenticated: payload !== null,
      user: payload
        ? { id: payload.sub, username: payload.username }
        : null,
      registrationAllowed: env.auth.allowRegistration(),
      hasUsers: userCount > 0,
    });
  });
}
