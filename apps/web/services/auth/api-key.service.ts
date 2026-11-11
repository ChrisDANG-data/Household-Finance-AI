import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { AppError } from "@/utils/errors";

/** Every key starts with this so it is easy to recognise (and to scan for in leaks). */
export const API_KEY_PREFIX = "hfi_";
export const MAX_ACTIVE_KEYS_PER_USER = 5;
const MAX_NAME_LENGTH = 60;

export interface ApiKeySummary {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export interface VerifiedApiKey {
  keyId: string;
  userId: string;
}

export function generateApiKey(): string {
  return `${API_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
}

/** Keys are high-entropy random strings, so a fast hash is enough (no salt needed). */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function looksLikeApiKey(value: string | null | undefined): value is string {
  return (
    typeof value === "string" &&
    value.startsWith(API_KEY_PREFIX) &&
    value.length >= API_KEY_PREFIX.length + 32 &&
    value.length <= 128
  );
}

/** Read `Authorization: Bearer hfi_...` — returns null when absent or malformed. */
export function readBearerApiKey(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  const candidate = match?.[1];
  return looksLikeApiKey(candidate) ? candidate : null;
}

function toSummary(row: {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}): ApiKeySummary {
  return {
    id: row.id,
    name: row.name,
    key_prefix: row.keyPrefix,
    created_at: row.createdAt.toISOString(),
    last_used_at: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
  };
}

export class ApiKeyService {
  /** Create a key. The raw key is returned once and never stored. */
  async create(
    userId: string,
    rawName: unknown,
  ): Promise<{ key: string; api_key: ApiKeySummary }> {
    const name =
      typeof rawName === "string" && rawName.trim() ? rawName.trim() : "My agent";
    if (name.length > MAX_NAME_LENGTH) {
      throw new AppError(`name must be ${MAX_NAME_LENGTH} characters or fewer`, {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    const active = await prisma.apiKey.count({
      where: { userId, revokedAt: null },
    });
    if (active >= MAX_ACTIVE_KEYS_PER_USER) {
      throw new AppError(
        `You can have at most ${MAX_ACTIVE_KEYS_PER_USER} active API keys. Revoke one first.`,
        { code: "VALIDATION_ERROR", statusCode: 400 },
      );
    }

    const key = generateApiKey();
    const row = await prisma.apiKey.create({
      data: {
        userId,
        name,
        keyPrefix: key.slice(0, 12),
        keyHash: hashApiKey(key),
      },
    });

    return { key, api_key: toSummary(row) };
  }

  async list(userId: string): Promise<ApiKeySummary[]> {
    const rows = await prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toSummary);
  }

  /** Revoke a key. Scoped by userId so one user can never revoke another user's key. */
  async revoke(userId: string, id: string): Promise<void> {
    const result = await prisma.apiKey.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) {
      throw new AppError("API key not found", {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }
  }

  /** Resolve a raw key to its owner. Returns null for unknown or revoked keys. */
  async verify(rawKey: string | null | undefined): Promise<VerifiedApiKey | null> {
    if (!looksLikeApiKey(rawKey)) return null;

    const row = await prisma.apiKey.findUnique({
      where: { keyHash: hashApiKey(rawKey) },
      select: { id: true, userId: true, revokedAt: true },
    });
    if (!row || row.revokedAt) return null;

    // Best effort — never fail a request because the "last used" stamp failed.
    prisma.apiKey
      .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    return { keyId: row.id, userId: row.userId };
  }
}

export const apiKeyService = new ApiKeyService();
