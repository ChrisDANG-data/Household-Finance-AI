import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  document: { findMany: vi.fn() },
  financialEvent: { findMany: vi.fn() },
  financialObligation: { findMany: vi.fn() },
  financialState: { findUnique: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { compileWikiVault } from "@/services/wiki/compile-wiki.service";

describe("compileWikiVault user scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.document.findMany.mockResolvedValue([]);
    db.financialEvent.findMany.mockResolvedValue([]);
    db.financialObligation.findMany.mockResolvedValue([]);
    db.financialState.findUnique.mockResolvedValue(null);
  });

  it("reads only the given user's rows from every table", async () => {
    await compileWikiVault("user_1");

    expect(db.document.findMany.mock.calls[0][0].where).toEqual({ userId: "user_1" });
    expect(db.financialEvent.findMany.mock.calls[0][0].where).toEqual({ userId: "user_1" });
    expect(db.financialObligation.findMany.mock.calls[0][0].where).toEqual({
      userId: "user_1",
    });
    expect(db.financialState.findUnique.mock.calls[0][0].where).toEqual({
      userId: "user_1",
    });
  });

  it("never runs an unscoped query when no user is given", async () => {
    await compileWikiVault();

    for (const call of [
      db.document.findMany.mock.calls[0][0],
      db.financialEvent.findMany.mock.calls[0][0],
      db.financialObligation.findMany.mock.calls[0][0],
    ]) {
      expect(call.where).toEqual({ userId: "default" });
    }
  });
});
