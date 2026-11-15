import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ document: { count: vi.fn() } }));

vi.mock("@/lib/prisma", () => ({ prisma: db }));

import {
  DEFAULT_MAX_DOCUMENTS_PER_USER,
  assertDocumentQuota,
  resolveMaxDocumentsPerUser,
} from "@/services/document-intelligence/document-quota";

describe("document quota", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.VERCEL;
    delete process.env.AUTH_ENABLED;
    delete process.env.MAX_DOCUMENTS_PER_USER;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("resolves the limit from env", () => {
    expect(resolveMaxDocumentsPerUser()).toBeNull();

    process.env.VERCEL = "1";
    expect(resolveMaxDocumentsPerUser()).toBe(DEFAULT_MAX_DOCUMENTS_PER_USER);

    process.env.MAX_DOCUMENTS_PER_USER = "5";
    expect(resolveMaxDocumentsPerUser()).toBe(5);

    process.env.MAX_DOCUMENTS_PER_USER = "0";
    expect(resolveMaxDocumentsPerUser()).toBeNull();
  });

  it("does not query when unlimited", async () => {
    await expect(assertDocumentQuota("user_1")).resolves.toBeUndefined();
    expect(db.document.count).not.toHaveBeenCalled();
  });

  it("allows uploads below the limit and blocks at the limit, per user", async () => {
    process.env.MAX_DOCUMENTS_PER_USER = "3";

    db.document.count.mockResolvedValue(2);
    await expect(assertDocumentQuota("user_1")).resolves.toBeUndefined();
    expect(db.document.count).toHaveBeenCalledWith({ where: { userId: "user_1" } });

    db.document.count.mockResolvedValue(3);
    await expect(assertDocumentQuota("user_1")).rejects.toMatchObject({
      code: "QUOTA_EXCEEDED",
      statusCode: 403,
    });
  });
});
