import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    apiKey: { findUnique: vi.fn(), update: vi.fn() },
    aiUsageDaily: { upsert: vi.fn(), findUnique: vi.fn() },
  },
  question: vi.fn(),
  ledger: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }));
vi.mock("@/services/automation/financial-question.service", () => ({
  handleAutomationFinancialQuestion: mocks.question,
}));
vi.mock("@/services/automation/ledger-event.service", () => ({
  ledgerEventAutomationService: { handle: mocks.ledger },
}));

import { POST as ledgerPost } from "@/app/api/agent/ledger-event/route";
import { GET as meGet } from "@/app/api/agent/me/route";
import { POST as questionPost } from "@/app/api/agent/question/route";
import { generateApiKey, hashApiKey } from "@/services/auth/api-key.service";

const KEY = generateApiKey();

function post(path: string, body: unknown, key: string | null = KEY): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("agent API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AI_DAILY_LIMIT = "2";
    mocks.db.apiKey.update.mockResolvedValue({});
    mocks.db.apiKey.findUnique.mockImplementation(async ({ where }) =>
      where.keyHash === hashApiKey(KEY)
        ? { id: "key_1", userId: "owner_1", revokedAt: null }
        : null,
    );
    mocks.db.aiUsageDaily.upsert.mockResolvedValue({ count: 1 });
    mocks.db.aiUsageDaily.findUnique.mockResolvedValue({ count: 1 });
    mocks.question.mockResolvedValue({ reply: "ok", route: "ledger" });
    mocks.ledger.mockResolvedValue({ status: "preview", reply: "Save?" });
  });

  it("rejects requests without a valid key", async () => {
    const missing = await questionPost(post("/api/agent/question", { message: "hi" }, null));
    expect(missing.status).toBe(401);

    const wrong = await questionPost(
      post("/api/agent/question", { message: "hi" }, generateApiKey()),
    );
    expect(wrong.status).toBe(401);

    const shared = await meGet(
      new Request("http://localhost/api/agent/me", {
        headers: { Authorization: "Bearer shared-automation-token" },
      }),
    );
    expect(shared.status).toBe(401);
    expect(mocks.question).not.toHaveBeenCalled();
  });

  it("always answers as the key owner, ignoring user_id in the body", async () => {
    const response = await questionPost(
      post("/api/agent/question", { message: " income in July ", user_id: "victim" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.reply).toBe("ok");
    expect(payload.data.usage.remaining).toBe(1);
    expect(mocks.question).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "owner_1", message: "income in July" }),
    );
  });

  it("stops at the daily limit before calling the AI", async () => {
    mocks.db.aiUsageDaily.upsert.mockResolvedValue({ count: 3 });

    const response = await questionPost(post("/api/agent/question", { message: "hi" }));
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.error.code).toBe("RATE_LIMITED");
    expect(mocks.question).not.toHaveBeenCalled();
  });

  it("validates the question before spending quota", async () => {
    const empty = await questionPost(post("/api/agent/question", { message: "  " }));
    expect(empty.status).toBe(400);

    const long = await questionPost(
      post("/api/agent/question", { message: "x".repeat(1001) }),
    );
    expect(long.status).toBe(400);
    expect(mocks.db.aiUsageDaily.upsert).not.toHaveBeenCalled();
  });

  it("previews ledger writes unless confirm is exactly true, scoped to the owner", async () => {
    await ledgerPost(
      post("/api/agent/ledger-event", {
        kind: "expense",
        category: "rent",
        amount: 100,
        user_id: "victim",
      }),
    );
    expect(mocks.ledger).toHaveBeenLastCalledWith(
      expect.objectContaining({ user_id: "owner_1", confirm: false }),
    );

    await ledgerPost(
      post("/api/agent/ledger-event", {
        kind: "expense",
        category: "rent",
        amount: 100,
        confirm: true,
      }),
    );
    expect(mocks.ledger).toHaveBeenLastCalledWith(
      expect.objectContaining({ user_id: "owner_1", confirm: true }),
    );
  });

  it("reports usage on /me without counting a request", async () => {
    const response = await meGet(
      new Request("http://localhost/api/agent/me", {
        headers: { Authorization: `Bearer ${KEY}` },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({
      authenticated: true,
      usage: { limit: 2, used: 1, remaining: 1 },
    });
    expect(mocks.db.aiUsageDaily.upsert).not.toHaveBeenCalled();
  });
});
