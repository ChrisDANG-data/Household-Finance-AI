import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  apiKey: {
    count: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));

import {
  API_KEY_PREFIX,
  MAX_ACTIVE_KEYS_PER_USER,
  apiKeyService,
  generateApiKey,
  hashApiKey,
  looksLikeApiKey,
  readBearerApiKey,
} from "@/services/auth/api-key.service";

function requestWith(authorization?: string): Request {
  return new Request("http://localhost/api/agent/me", {
    headers: authorization ? { Authorization: authorization } : {},
  });
}

describe("api key helpers", () => {
  it("generates unique prefixed keys", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(a).not.toBe(b);
    expect(looksLikeApiKey(a)).toBe(true);
  });

  it("hashes deterministically without exposing the key", () => {
    const key = generateApiKey();
    expect(hashApiKey(key)).toBe(hashApiKey(key));
    expect(hashApiKey(key)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashApiKey(key)).not.toContain(key);
  });

  it("reads only well-formed bearer keys", () => {
    const key = generateApiKey();
    expect(readBearerApiKey(requestWith(`Bearer ${key}`))).toBe(key);
    expect(readBearerApiKey(requestWith())).toBeNull();
    expect(readBearerApiKey(requestWith("Bearer some-shared-token"))).toBeNull();
    expect(readBearerApiKey(requestWith("Bearer hfi_short"))).toBeNull();
    expect(readBearerApiKey(requestWith(`Basic ${key}`))).toBeNull();
  });
});

describe("ApiKeyService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.apiKey.update.mockResolvedValue({});
  });

  it("stores only the hash and returns the raw key once", async () => {
    db.apiKey.count.mockResolvedValue(0);
    db.apiKey.create.mockImplementation(async ({ data }) => ({
      id: "key_1",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      lastUsedAt: null,
      ...data,
    }));

    const { key, api_key } = await apiKeyService.create("user_1", "  Laptop ");

    const stored = db.apiKey.create.mock.calls[0][0].data;
    expect(stored.userId).toBe("user_1");
    expect(stored.name).toBe("Laptop");
    expect(stored.keyHash).toBe(hashApiKey(key));
    expect(JSON.stringify(stored)).not.toContain(key);
    expect(api_key.key_prefix).toBe(key.slice(0, 12));
    expect(api_key).not.toHaveProperty("keyHash");
  });

  it("caps active keys per user", async () => {
    db.apiKey.count.mockResolvedValue(MAX_ACTIVE_KEYS_PER_USER);
    await expect(apiKeyService.create("user_1", "x")).rejects.toThrow(/at most/);
    expect(db.apiKey.create).not.toHaveBeenCalled();
  });

  it("resolves a valid key to its owner", async () => {
    const key = generateApiKey();
    db.apiKey.findUnique.mockResolvedValue({
      id: "key_1",
      userId: "user_1",
      revokedAt: null,
    });

    await expect(apiKeyService.verify(key)).resolves.toEqual({
      keyId: "key_1",
      userId: "user_1",
    });
    expect(db.apiKey.findUnique.mock.calls[0][0].where).toEqual({
      keyHash: hashApiKey(key),
    });
  });

  it("rejects revoked, unknown, and malformed keys", async () => {
    const key = generateApiKey();

    db.apiKey.findUnique.mockResolvedValue({
      id: "key_1",
      userId: "user_1",
      revokedAt: new Date(),
    });
    await expect(apiKeyService.verify(key)).resolves.toBeNull();

    db.apiKey.findUnique.mockResolvedValue(null);
    await expect(apiKeyService.verify(key)).resolves.toBeNull();

    db.apiKey.findUnique.mockClear();
    await expect(apiKeyService.verify("not-a-key")).resolves.toBeNull();
    await expect(apiKeyService.verify(null)).resolves.toBeNull();
    expect(db.apiKey.findUnique).not.toHaveBeenCalled();
  });

  it("only revokes keys owned by the caller", async () => {
    db.apiKey.updateMany.mockResolvedValue({ count: 0 });
    await expect(apiKeyService.revoke("user_2", "key_1")).rejects.toThrow(/not found/);
    expect(db.apiKey.updateMany.mock.calls[0][0].where).toEqual({
      id: "key_1",
      userId: "user_2",
      revokedAt: null,
    });

    db.apiKey.updateMany.mockResolvedValue({ count: 1 });
    await expect(apiKeyService.revoke("user_1", "key_1")).resolves.toBeUndefined();
  });
});
