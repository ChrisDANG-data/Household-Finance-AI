import { isAuthEnabled } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/utils/errors";

export const DEFAULT_AI_DAILY_LIMIT = 20;
export const DEFAULT_AI_GLOBAL_DAILY_LIMIT = 300;
/** Reserved counter id for the whole service (real user ids are cuids, so no clash). */
export const GLOBAL_USAGE_ID = "__global__";

export interface AiUsageStatus {
  limit: number | null;
  used: number;
  remaining: number | null;
  resets_at: string;
}

/**
 * Daily AI request limit per user.
 * - AI_DAILY_LIMIT=<n> sets it explicitly; 0 turns the limit off.
 * - Unset: 20/day when login is enabled (production), unlimited in local dev.
 */
export function resolveAiDailyLimit(): number | null {
  const raw = process.env.AI_DAILY_LIMIT?.trim();
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed === 0 ? null : Math.floor(parsed);
    }
  }
  return isAuthEnabled() ? DEFAULT_AI_DAILY_LIMIT : null;
}

/**
 * Daily AI request cap across ALL users — stops many accounts adding up to a large bill.
 * - AI_GLOBAL_DAILY_LIMIT=<n> sets it explicitly; 0 turns it off.
 * - Unset: 300/day when login is enabled (production), unlimited in local dev.
 */
export function resolveAiGlobalDailyLimit(): number | null {
  const raw = process.env.AI_GLOBAL_DAILY_LIMIT?.trim();
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed === 0 ? null : Math.floor(parsed);
    }
  }
  return isAuthEnabled() ? DEFAULT_AI_GLOBAL_DAILY_LIMIT : null;
}

export function utcDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function nextUtcMidnight(now: Date = new Date()): string {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return next.toISOString();
}

/** Prisma P2021 = table does not exist (schema not pushed yet). */
function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2021"
  );
}

export class AiUsageService {
  /**
   * Count one AI request for this user and reject it once the daily limit is passed.
   * Call BEFORE any paid LLM / embedding / speech call.
   */
  async consume(userId: string, now: Date = new Date()): Promise<AiUsageStatus> {
    const limit = resolveAiDailyLimit();
    const globalLimit = resolveAiGlobalDailyLimit();
    const resets_at = nextUtcMidnight(now);
    const day = utcDay(now);

    let used = 0;
    if (limit !== null) {
      const count = await this.increment(userId, day);
      if (count === null) {
        return { limit, used: 0, remaining: limit, resets_at };
      }
      used = count;
      if (used > limit) {
        throw new AppError(
          `Daily AI limit reached (${limit} requests per day). Try again after ${resets_at}.`,
          { code: "RATE_LIMITED", statusCode: 429 },
        );
      }
    }

    // Service-wide cap — only requests that passed the per-user limit count towards it.
    if (globalLimit !== null) {
      const total = await this.increment(GLOBAL_USAGE_ID, day);
      if (total !== null && total > globalLimit) {
        throw new AppError(
          `This demo service has reached its daily AI capacity. Try again after ${resets_at}.`,
          { code: "RATE_LIMITED", statusCode: 429 },
        );
      }
    }

    if (limit === null) {
      return { limit: null, used: 0, remaining: null, resets_at };
    }
    return { limit, used, remaining: Math.max(0, limit - used), resets_at };
  }

  /** Atomic +1 for one counter. Returns null when the table does not exist yet. */
  private async increment(id: string, day: string): Promise<number | null> {
    try {
      // Atomic increment — safe when two requests arrive at the same time.
      const row = await prisma.aiUsageDaily.upsert({
        where: { userId_day: { userId: id, day } },
        create: { userId: id, day, count: 1 },
        update: { count: { increment: 1 } },
        select: { count: true },
      });
      return row.count;
    } catch (error) {
      if (isMissingTableError(error)) {
        console.warn(
          "[ai-usage] ai_usage_daily table is missing — run `npm run db:push`. Limit not enforced.",
        );
        return null;
      }
      throw error;
    }
  }

  /** Read current usage without counting a request. */
  async status(userId: string, now: Date = new Date()): Promise<AiUsageStatus> {
    const limit = resolveAiDailyLimit();
    const resets_at = nextUtcMidnight(now);
    if (limit === null) {
      return { limit: null, used: 0, remaining: null, resets_at };
    }

    let used = 0;
    try {
      const row = await prisma.aiUsageDaily.findUnique({
        where: { userId_day: { userId, day: utcDay(now) } },
        select: { count: true },
      });
      used = Math.min(row?.count ?? 0, limit);
    } catch (error) {
      if (!isMissingTableError(error)) throw error;
    }

    return { limit, used, remaining: Math.max(0, limit - used), resets_at };
  }
}

export const aiUsageService = new AiUsageService();
