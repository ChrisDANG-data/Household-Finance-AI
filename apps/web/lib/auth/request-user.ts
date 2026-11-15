import { cookies } from "next/headers";

import { isAuthEnabled } from "@/lib/auth/config";
import {
  readSessionPayload,
  SESSION_COOKIE_NAME,
  sessionIssuedAt,
  type SessionPayload,
} from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { DEFAULT_USER_ID } from "@/services/financial-state/financial-state.persistence";
import { AppError } from "@/utils/errors";

/** Prisma P2022 = column does not exist (schema not pushed yet). */
function isMissingColumnError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2022"
  );
}

/**
 * A signed cookie is not enough on its own: the account may have been deleted,
 * or its password changed, since the cookie was issued. Check both.
 */
export async function isSessionStillValid(payload: SessionPayload): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { sessionsValidAfter: true },
    });
    if (!user) return false;
    if (!user.sessionsValidAfter) return true;
    return sessionIssuedAt(payload) * 1000 >= user.sessionsValidAfter.getTime();
  } catch (error) {
    if (isMissingColumnError(error)) {
      console.warn(
        "[auth] users.sessions_valid_after is missing — run `npm run db:push`. Session check skipped.",
      );
      return true;
    }
    throw error;
  }
}

/** The signed-in session, or null when there is none or it is no longer valid. */
export async function readValidSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = await readSessionPayload(token ?? null);
  if (!payload) return null;
  return (await isSessionStillValid(payload)) ? payload : null;
}

/**
 * Resolve the authenticated household user id for API handlers.
 * When auth is disabled (local dev), falls back to the legacy shared ledger id.
 */
export async function resolveRequestUserId(): Promise<string> {
  if (!isAuthEnabled()) return DEFAULT_USER_ID;

  const payload = await readValidSession();
  if (!payload) {
    throw new AppError("Authentication required", {
      code: "UNAUTHORIZED",
      statusCode: 401,
    });
  }
  return payload.sub;
}

/** Reject client-supplied user_id when it does not match the session user. */
export function assertMatchingUserId(
  sessionUserId: string,
  clientUserId: string | null | undefined,
): void {
  if (!clientUserId || clientUserId === sessionUserId) return;
  throw new AppError("Forbidden: user_id does not match your session", {
    code: "FORBIDDEN",
    statusCode: 403,
  });
}
