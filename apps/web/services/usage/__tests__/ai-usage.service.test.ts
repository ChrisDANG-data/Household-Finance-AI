import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  aiUsageDaily: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));

import {
  DEFAULT_AI_DAILY_LIMIT,
  DEFAULT_AI_GLOBAL_DAILY_LIMIT,
  GLOBAL_USAGE_ID,
  aiUsageService,
  resolveAiDailyLimit,
  resolveAiGlobalDailyLimit,
  utcDay,
} from "@/services/usage/ai-usage.service";

const NOW = new Date("2026-11-11T15:30:00Z");

describe("AI daily limit", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.VERCEL;
    delete process.env.AUTH_ENABLED;
    delete process.env.AI_DAILY_LIMIT;
    delete process.env.AI_GLOBAL_DAILY_LIMIT;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("resolves the limit from env", () => {
    expect(resolveAiDailyLimit()).toBeNull();

    process.env.VERCEL = "1";
    expect(resolveAiDailyLimit()).toBe(DEFAULT_AI_DAILY_LIMIT);

    process.env.AI_DAILY_LIMIT = "5";
    expect(resolveAiDailyLimit()).toBe(5);

    process.env.AI_DAILY_LIMIT = "0";
    expect(resolveAiDailyLimit()).toBeNull();

    process.env.AI_DAILY_LIMIT = "nonsense";
    expect(resolveAiDailyLimit()).toBe(DEFAULT_AI_DAILY_LIMIT);
  });

  it("does not touch the database when unlimited", async () => {
    const status = await aiUsageService.consume("user_1", NOW);
    expect(status.limit).toBeNull();
    expect(db.aiUsageDaily.upsert).not.toHaveBeenCalled();
  });

  it("counts per user per UTC day and reports what is left", async () => {
    process.env.AI_DAILY_LIMIT = "3";
    db.aiUsageDaily.upsert.mockResolvedValue({ count: 2 });

    const status = await aiUsageService.consume("user_1", NOW);

    expect(status).toEqual({
      limit: 3,
      used: 2,
      remaining: 1,
      resets_at: "2026-11-12T00:00:00.000Z",
    });
    expect(db.aiUsageDaily.upsert.mock.calls[0][0].where).toEqual({
      userId_day: { userId: "user_1", day: "2026-11-11" },
    });
    expect(utcDay(NOW)).toBe("2026-11-11");
  });

  it("allows the last request and rejects the next one with 429", async () => {
    process.env.AI_DAILY_LIMIT = "3";

    db.aiUsageDaily.upsert.mockResolvedValue({ count: 3 });
    await expect(aiUsageService.consume("user_1", NOW)).resolves.toMatchObject({
      remaining: 0,
    });

    db.aiUsageDaily.upsert.mockResolvedValue({ count: 4 });
    await expect(aiUsageService.consume("user_1", NOW)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      statusCode: 429,
    });
  });

  it("resolves the service-wide cap from env", () => {
    expect(resolveAiGlobalDailyLimit()).toBeNull();

    process.env.VERCEL = "1";
    expect(resolveAiGlobalDailyLimit()).toBe(DEFAULT_AI_GLOBAL_DAILY_LIMIT);

    process.env.AI_GLOBAL_DAILY_LIMIT = "50";
    expect(resolveAiGlobalDailyLimit()).toBe(50);

    process.env.AI_GLOBAL_DAILY_LIMIT = "0";
    expect(resolveAiGlobalDailyLimit()).toBeNull();
  });

  it("stops everyone once the service-wide cap is reached", async () => {
    process.env.AI_DAILY_LIMIT = "5";
    process.env.AI_GLOBAL_DAILY_LIMIT = "100";
    const counts: Record<string, number> = { user_1: 1, [GLOBAL_USAGE_ID]: 100 };
    db.aiUsageDaily.upsert.mockImplementation(async ({ where }) => ({
      count: counts[where.userId_day.userId],
    }));

    await expect(aiUsageService.consume("user_1", NOW)).resolves.toMatchObject({
      remaining: 4,
    });

    counts[GLOBAL_USAGE_ID] = 101;
    await expect(aiUsageService.consume("user_1", NOW)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      statusCode: 429,
      message: expect.stringContaining("daily AI capacity"),
    });
  });

  it("does not count a user's over-limit request towards the service-wide cap", async () => {
    process.env.AI_DAILY_LIMIT = "3";
    process.env.AI_GLOBAL_DAILY_LIMIT = "100";
    db.aiUsageDaily.upsert.mockResolvedValue({ count: 4 });

    await expect(aiUsageService.consume("user_1", NOW)).rejects.toMatchObject({
      statusCode: 429,
    });
    expect(db.aiUsageDaily.upsert).toHaveBeenCalledTimes(1);
  });

  it("keeps working (with a warning) before the table exists", async () => {
    process.env.AI_DAILY_LIMIT = "3";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    db.aiUsageDaily.upsert.mockRejectedValue(
      Object.assign(new Error("missing table"), { code: "P2021" }),
    );

    await expect(aiUsageService.consume("user_1", NOW)).resolves.toMatchObject({
      limit: 3,
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not hide other database errors", async () => {
    process.env.AI_DAILY_LIMIT = "3";
    db.aiUsageDaily.upsert.mockRejectedValue(new Error("connection lost"));
    await expect(aiUsageService.consume("user_1", NOW)).rejects.toThrow(
      /connection lost/,
    );
  });
});
