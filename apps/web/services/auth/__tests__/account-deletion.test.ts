import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const table = () => ({ deleteMany: vi.fn((args) => ({ op: "deleteMany", args })) });
  return {
    db: {
      user: {
        findUnique: vi.fn(),
        delete: vi.fn((args) => ({ op: "userDelete", args })),
      },
      document: { findMany: vi.fn(), ...table() },
      plaidItem: { findMany: vi.fn(), ...table() },
      financialEvent: table(),
      financialObligation: table(),
      financialState: table(),
      manualAccountBalance: table(),
      plaidBalanceHistory: table(),
      plaidSyncCursor: table(),
      apiKey: table(),
      aiUsageDaily: table(),
      $transaction: vi.fn(),
    },
    deleteFile: vi.fn(),
    removeItem: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }));
vi.mock("@/lib/storage/document-storage", () => ({
  deleteDocumentFile: mocks.deleteFile,
}));
vi.mock("@/services/integrations/plaid/plaid-api.service", () => ({
  plaidApiService: { isConfigured: () => true, removeItem: mocks.removeItem },
}));

import { hashPassword } from "@/lib/auth/password";
import { accountDeletionService } from "@/services/auth/account-deletion.service";

const { db } = mocks;

describe("account deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AUTH_SHARED_ACCOUNTS;
    db.user.findUnique.mockResolvedValue({
      id: "user_1",
      username: "alice",
      passwordHash: hashPassword("password123"),
    });
    db.document.findMany.mockResolvedValue([
      { storagePath: "https://blob.example/a.pdf" },
      { storagePath: "https://blob.example/b.pdf" },
    ]);
    db.plaidItem.findMany.mockResolvedValue([
      { itemId: "item_1", accessToken: "access-token-1" },
    ]);
    db.$transaction.mockResolvedValue([]);
    mocks.deleteFile.mockResolvedValue(undefined);
    mocks.removeItem.mockResolvedValue(undefined);
  });

  it("refuses without the correct password and deletes nothing", async () => {
    await expect(
      accountDeletionService.deleteAccount("user_1", "wrong"),
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(mocks.deleteFile).not.toHaveBeenCalled();
  });

  it("refuses to delete the shared demo account", async () => {
    process.env.AUTH_SHARED_ACCOUNTS = "shareddemo";
    db.user.findUnique.mockResolvedValue({
      id: "demo",
      username: "shareddemo",
      passwordHash: hashPassword("shared-demo-password"),
    });
    await expect(
      accountDeletionService.deleteAccount("demo", "shared-demo-password"),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("removes every table's rows for that user only, in one transaction", async () => {
    const result = await accountDeletionService.deleteAccount("user_1", "password123");

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    const ops = db.$transaction.mock.calls[0][0] as Array<{
      op: string;
      args: { where: Record<string, unknown> };
    }>;
    expect(ops).toHaveLength(11);

    for (const table of [
      db.financialEvent,
      db.financialObligation,
      db.document,
      db.financialState,
      db.manualAccountBalance,
      db.plaidBalanceHistory,
      db.plaidItem,
      db.apiKey,
      db.aiUsageDaily,
    ]) {
      expect(table.deleteMany).toHaveBeenCalledWith({ where: { userId: "user_1" } });
    }
    expect(db.plaidSyncCursor.deleteMany).toHaveBeenCalledWith({
      where: { itemId: { in: ["item_1"] } },
    });
    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: "user_1" } });
    expect(ops[ops.length - 1].op).toBe("userDelete");

    expect(mocks.deleteFile).toHaveBeenCalledTimes(2);
    expect(mocks.removeItem).toHaveBeenCalledWith("access-token-1");
    expect(result).toEqual({ deleted: true, documents: 2, warnings: [] });
  });

  it("still deletes the account when file or bank cleanup fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.deleteFile.mockRejectedValue(new Error("storage down"));
    mocks.removeItem.mockRejectedValue(new Error("plaid down"));

    const result = await accountDeletionService.deleteAccount("user_1", "password123");

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(result.deleted).toBe(true);
    expect(result.warnings).toHaveLength(2);
    warn.mockRestore();
  });
});
