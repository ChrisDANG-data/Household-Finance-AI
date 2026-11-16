import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  financialEvent: { count: vi.fn() },
  document: { count: vi.fn() },
  manualAccountBalance: { count: vi.fn() },
  financialState: { findUnique: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { isAccountEmpty } from "@/services/financial-state/empty-account";

describe("isAccountEmpty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.financialEvent.count.mockResolvedValue(0);
    db.document.count.mockResolvedValue(0);
    db.manualAccountBalance.count.mockResolvedValue(0);
    db.financialState.findUnique.mockResolvedValue({ currentCash: 0 });
  });

  it("is true for a brand-new account, scoped to that user", async () => {
    await expect(isAccountEmpty("user_1")).resolves.toBe(true);
    expect(db.financialEvent.count).toHaveBeenCalledWith({ where: { userId: "user_1" } });

    db.financialState.findUnique.mockResolvedValue(null);
    await expect(isAccountEmpty("user_1")).resolves.toBe(true);
  });

  it("is false as soon as there is any data to answer from", async () => {
    db.financialEvent.count.mockResolvedValue(1);
    await expect(isAccountEmpty("user_1")).resolves.toBe(false);

    db.financialEvent.count.mockResolvedValue(0);
    db.document.count.mockResolvedValue(1);
    await expect(isAccountEmpty("user_1")).resolves.toBe(false);

    db.document.count.mockResolvedValue(0);
    db.manualAccountBalance.count.mockResolvedValue(1);
    await expect(isAccountEmpty("user_1")).resolves.toBe(false);

    db.manualAccountBalance.count.mockResolvedValue(0);
    db.financialState.findUnique.mockResolvedValue({ currentCash: "250.00" });
    await expect(isAccountEmpty("user_1")).resolves.toBe(false);
  });
});
