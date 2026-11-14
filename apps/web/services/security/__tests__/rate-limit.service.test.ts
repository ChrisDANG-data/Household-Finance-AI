import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  rateLimitBucket: { upsert: vi.fn(), deleteMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));

import {
  clientIp,
  rateLimitKey,
  rateLimitService,
} from "@/services/security/rate-limit.service";

const RULE = { limit: 3, windowSeconds: 900 };
const NOW = new Date("2026-11-14T15:07:00Z");

describe("rate limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.rateLimitBucket.deleteMany.mockResolvedValue({ count: 0 });
  });

  it("reads the client address from proxy headers", () => {
    const request = new Request("http://localhost/", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    expect(clientIp(request)).toBe("203.0.113.7");
    expect(clientIp(new Request("http://localhost/"))).toBe("unknown");
  });

  it("stores hashed keys, never the raw address or username", () => {
    const key = rateLimitKey("login:ip", "203.0.113.7");
    expect(key).toMatch(/^login:ip:[0-9a-f]{32}$/);
    expect(key).not.toContain("203.0.113.7");
    expect(rateLimitKey("login:user", " Alice ")).toBe(
      rateLimitKey("login:user", "alice"),
    );
    expect(rateLimitKey("login:user", "alice")).not.toBe(
      rateLimitKey("reset:user", "alice"),
    );
  });

  it("allows attempts up to the limit and then returns 429", async () => {
    db.rateLimitBucket.upsert.mockResolvedValue({ count: 3 });
    await expect(
      rateLimitService.hit("login:user", "alice", RULE, NOW),
    ).resolves.toBeUndefined();

    db.rateLimitBucket.upsert.mockResolvedValue({ count: 4 });
    await expect(
      rateLimitService.hit("login:user", "alice", RULE, NOW),
    ).rejects.toMatchObject({ code: "RATE_LIMITED", statusCode: 429 });
  });

  it("counts in fixed windows", async () => {
    db.rateLimitBucket.upsert.mockResolvedValue({ count: 2 });
    await rateLimitService.hit("login:user", "alice", RULE, NOW);

    const where = db.rateLimitBucket.upsert.mock.calls[0][0].where.key_windowStart;
    expect(where.windowStart.toISOString()).toBe("2026-11-14T15:00:00.000Z");
    expect(where.key).toBe(rateLimitKey("login:user", "alice"));
  });

  it("never blocks sign-in when the table is missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    db.rateLimitBucket.upsert.mockRejectedValue(
      Object.assign(new Error("missing table"), { code: "P2021" }),
    );
    await expect(
      rateLimitService.hit("login:user", "alice", RULE, NOW),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();

    db.rateLimitBucket.upsert.mockRejectedValue(new Error("connection lost"));
    await expect(
      rateLimitService.hit("login:user", "alice", RULE, NOW),
    ).rejects.toThrow(/connection lost/);
  });
});
