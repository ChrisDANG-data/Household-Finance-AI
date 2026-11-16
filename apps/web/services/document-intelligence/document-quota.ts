import { isAuthEnabled } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/utils/errors";

export const DEFAULT_MAX_DOCUMENTS_PER_USER = 20;

/**
 * How many documents one account may keep.
 * - MAX_DOCUMENTS_PER_USER=<n> sets it explicitly; 0 turns the limit off.
 * - Unset: 20 when login is enabled (production), unlimited in local dev.
 */
export function resolveMaxDocumentsPerUser(): number | null {
  const raw = process.env.MAX_DOCUMENTS_PER_USER?.trim();
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed === 0 ? null : Math.floor(parsed);
    }
  }
  return isAuthEnabled() ? DEFAULT_MAX_DOCUMENTS_PER_USER : null;
}

/** Reject an upload once the account already holds the maximum number of documents. */
export async function assertDocumentQuota(userId: string): Promise<void> {
  const max = resolveMaxDocumentsPerUser();
  if (max === null) return;

  const count = await prisma.document.count({ where: { userId } });
  if (count >= max) {
    throw new AppError(
      `Document limit reached (${max} per account). This demo service cannot store more for this account.`,
      { code: "QUOTA_EXCEEDED", statusCode: 403 },
    );
  }
}
