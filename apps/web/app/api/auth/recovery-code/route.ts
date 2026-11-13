import { withAuthenticatedHandler } from "@/lib/api/authenticated-handler";
import { userAuthService } from "@/services/auth/user-auth.service";
import { jsonSuccess } from "@/utils/api-response";
import { AppError } from "@/utils/errors";

export const runtime = "nodejs";

/** GET — whether the signed-in user has a recovery code (never returns the code). */
export async function GET() {
  return withAuthenticatedHandler(async (userId) => {
    return jsonSuccess(await userAuthService.getRecoveryStatus(userId));
  });
}

/** POST — issue a new recovery code. Requires the current password; shown once. */
export async function POST(request: Request) {
  return withAuthenticatedHandler(async (userId) => {
    const body = (await request.json().catch(() => ({}))) as { password?: unknown };
    const password = typeof body.password === "string" ? body.password : "";
    if (!password) {
      throw new AppError("Current password is required", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    const recovery_code = await userAuthService.regenerateRecoveryCode(userId, password);
    return jsonSuccess({ recovery_code }, { status: 201 });
  });
}
