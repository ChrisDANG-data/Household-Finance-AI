import { withAuthenticatedHandler } from "@/lib/api/authenticated-handler";
import {
  clearSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { accountDeletionService } from "@/services/auth/account-deletion.service";
import { isAccountEmpty } from "@/services/financial-state/empty-account";
import { jsonSuccess } from "@/utils/api-response";
import { AppError } from "@/utils/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

/** GET — small account summary for the UI (is there any data yet?). */
export async function GET() {
  return withAuthenticatedHandler(async (userId) => {
    return jsonSuccess({ empty_account: await isAccountEmpty(userId) });
  });
}

/**
 * DELETE — permanently delete the signed-in user's account and all their data.
 * Requires the current password in the body. Signs the user out.
 */
export async function DELETE(request: Request) {
  return withAuthenticatedHandler(async (userId) => {
    const body = (await request.json().catch(() => ({}))) as { password?: unknown };
    const password = typeof body.password === "string" ? body.password : "";
    if (!password) {
      throw new AppError("Current password is required", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    const result = await accountDeletionService.deleteAccount(userId, password);

    const response = jsonSuccess({ deleted: true, documents: result.documents });
    response.cookies.set(SESSION_COOKIE_NAME, "", clearSessionCookieOptions());
    return response;
  });
}
