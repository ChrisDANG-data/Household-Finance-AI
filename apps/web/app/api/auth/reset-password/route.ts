import { withApiHandler } from "@/lib/api/route-handler";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { userAuthService } from "@/services/auth/user-auth.service";
import { financialStatePersistence } from "@/services/financial-state/financial-state.persistence";
import { jsonSuccess } from "@/utils/api-response";
import { AppError } from "@/utils/errors";

export const runtime = "nodejs";

/**
 * POST — set a new password with the one-time recovery code.
 * Signs the user in and returns a NEW recovery code (the old one stops working).
 */
export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = (await request.json().catch(() => ({}))) as {
      username?: unknown;
      recovery_code?: unknown;
      new_password?: unknown;
    };
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const recoveryCode =
      typeof body.recovery_code === "string" ? body.recovery_code : "";
    const newPassword =
      typeof body.new_password === "string" ? body.new_password : "";

    if (!username || !recoveryCode || !newPassword) {
      throw new AppError("Username, recovery code, and new password are required", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    const user = await userAuthService.resetPasswordWithRecoveryCode(
      username,
      recoveryCode,
      newPassword,
    );
    await financialStatePersistence.ensureState(user.id);

    const token = await createSessionToken(user);
    const response = jsonSuccess({
      authenticated: true,
      user: { id: user.id, username: user.username },
      recovery_code: user.recoveryCode,
    });
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    return response;
  });
}
