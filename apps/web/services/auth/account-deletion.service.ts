import { verifyPassword } from "@/lib/auth/password";
import { isSharedAccount } from "@/lib/auth/recovery-code";
import { decryptSecret } from "@/lib/crypto/token-encryption";
import { prisma } from "@/lib/prisma";
import { deleteDocumentFile } from "@/lib/storage/document-storage";
import { plaidApiService } from "@/services/integrations/plaid/plaid-api.service";
import { AppError } from "@/utils/errors";

export interface AccountDeletionResult {
  deleted: true;
  documents: number;
  /** Things that could not be cleaned up outside the database (logged for the operator). */
  warnings: string[];
}

export class AccountDeletionService {
  /**
   * Permanently delete a user and everything stored for them.
   * Requires the current password. Shared demo accounts cannot be deleted.
   */
  async deleteAccount(
    userId: string,
    currentPassword: string,
  ): Promise<AccountDeletionResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, passwordHash: true },
    });
    if (!user) {
      throw new AppError("Account not found", {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }
    if (isSharedAccount(user.username)) {
      throw new AppError("Shared demo accounts cannot be deleted", {
        code: "FORBIDDEN",
        statusCode: 403,
      });
    }
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      throw new AppError("Current password is incorrect", {
        code: "UNAUTHORIZED",
        statusCode: 401,
      });
    }

    // Collect what lives outside the database before the rows are gone.
    const [documents, plaidItems] = await Promise.all([
      prisma.document.findMany({
        where: { userId },
        select: { storagePath: true },
      }),
      prisma.plaidItem.findMany({
        where: { userId },
        select: { itemId: true, accessToken: true },
      }),
    ]);
    const itemIds = plaidItems.map((item) => item.itemId);

    // One transaction: either everything for this user is removed, or nothing is.
    await prisma.$transaction([
      prisma.financialEvent.deleteMany({ where: { userId } }),
      prisma.financialObligation.deleteMany({ where: { userId } }),
      prisma.document.deleteMany({ where: { userId } }), // chunks + embeddings cascade
      prisma.financialState.deleteMany({ where: { userId } }),
      prisma.manualAccountBalance.deleteMany({ where: { userId } }),
      prisma.plaidBalanceHistory.deleteMany({ where: { userId } }),
      prisma.plaidSyncCursor.deleteMany({ where: { itemId: { in: itemIds } } }),
      prisma.plaidItem.deleteMany({ where: { userId } }),
      prisma.apiKey.deleteMany({ where: { userId } }),
      prisma.aiUsageDaily.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    // Best effort outside the database — the account is already gone at this point.
    const warnings: string[] = [];

    const fileResults = await Promise.allSettled(
      documents.map((doc) => deleteDocumentFile(doc.storagePath)),
    );
    const failedFiles = fileResults.filter((r) => r.status === "rejected").length;
    if (failedFiles > 0) {
      warnings.push(`${failedFiles} uploaded file(s) could not be removed from storage`);
    }

    const plaidResults = await Promise.allSettled(
      plaidItems.map(async (item) => {
        if (!plaidApiService.isConfigured()) return;
        await plaidApiService.removeItem(decryptSecret(item.accessToken));
      }),
    );
    const failedPlaid = plaidResults.filter((r) => r.status === "rejected").length;
    if (failedPlaid > 0) {
      warnings.push(`${failedPlaid} bank link(s) could not be revoked at Plaid`);
    }

    if (warnings.length > 0) {
      console.warn(`[account-deletion] user ${userId}: ${warnings.join("; ")}`);
    }

    return { deleted: true, documents: documents.length, warnings };
  }
}

export const accountDeletionService = new AccountDeletionService();
