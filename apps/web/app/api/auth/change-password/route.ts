import { withAuthenticatedHandler } from "@/lib/api/authenticated-handler";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { userAuthService } from "@/services/auth/user-auth.service";
import {
  AUTH_LIMITS,
  rateLimitService,
} from "@/services/security/rate-limit.service";
import { jsonSuccess } from "@/utils/api-response";
import { AppError } from "@/utils/errors";

export const runtime = "nodejs";

/**
 * POST — change the signed-in user's password.
 * Every other signed-in browser is signed out; this one gets a fresh session.
 */
export async function POST(request: Request) {
  return withAuthenticatedHandler(async (userId) => {
    const body = (await request.json().catch(() => ({}))) as {
      current_password?: unknown;
      new_password?: unknown;
    };
    const currentPassword =
      typeof body.current_password === "string" ? body.current_password : "";
    const newPassword =
      typeof body.new_password === "string" ? body.new_password : "";

    if (!currentPassword || !newPassword) {
      throw new AppError("Current password and new password are required", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    // Same guess limit as sign-in, so a stolen session cannot brute-force the password.
    await rateLimitService.hit("pwchange:user", userId, AUTH_LIMITS.loginPerUsername);

    const user = await userAuthService.changePassword(
      userId,
      currentPassword,
      newPassword,
    );

    const token = await createSessionToken(user);
    const response = jsonSuccess({ changed: true });
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    return response;
  });
}
