import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { AppError } from "@/utils/errors";

const MINUTE = 60;
const DAY = 24 * 60 * MINUTE;

/** Attempt limits for the sign-in pages. All attempts count, not only failures. */
export const AUTH_LIMITS = {
  /** Password guesses against one username. */
  loginPerUsername: { limit: 6, windowSeconds: 15 * MINUTE },
  /** Sign-in attempts from one network address (any username). */
  loginPerIp: { limit: 30, windowSeconds: 15 * MINUTE },
  /** Recovery-code guesses against one username. */
  resetPerUsername: { limit: 6, windowSeconds: 15 * MINUTE },
  resetPerIp: { limit: 30, windowSeconds: 15 * MINUTE },
  /** New accounts from one network address per day. */
  signupPerIp: { limit: 10, windowSeconds: DAY },
  /** New accounts across the whole service per day. */
  signupGlobal: { limit: 200, windowSeconds: DAY },
} as const;

export interface RateLimitRule {
  limit: number;
  windowSeconds: number;
}

/** Best-effort caller address. On Vercel the first x-forwarded-for entry is the client. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Keys are stored hashed so the table never holds raw IP addresses or usernames. */
export function rateLimitKey(scope: string, value: string): string {
  const digest = createHash("sha256")
    .update(`${scope}:${value.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
  return `${scope}:${digest}`;
}

function windowStart(now: Date, windowSeconds: number): Date {
  const windowMs = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

/** Prisma P2021 = table does not exist (schema not pushed yet). */
function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2021"
  );
}

export class RateLimitService {
  /**
   * Count one attempt and throw 429 once the limit for the current window is passed.
   * Limits are skipped (with a warning) until the table exists, so a missed
   * `db push` can never lock everyone out of signing in.
   */
  async hit(
    scope: string,
    value: string,
    rule: RateLimitRule,
    now: Date = new Date(),
  ): Promise<void> {
    const start = windowStart(now, rule.windowSeconds);
    const key = rateLimitKey(scope, value);

    let count: number;
    try {
      const row = await prisma.rateLimitBucket.upsert({
        where: { key_windowStart: { key, windowStart: start } },
        create: { key, windowStart: start, count: 1 },
        update: { count: { increment: 1 } },
        select: { count: true },
      });
      count = row.count;
    } catch (error) {
      if (isMissingTableError(error)) {
        console.warn(
          "[rate-limit] rate_limit_buckets table is missing — run `npm run db:push`. Limit not enforced.",
        );
        return;
      }
      throw error;
    }

    // Occasionally clear out old windows so the table stays small.
    if (count === 1 && Math.random() < 0.02) {
      prisma.rateLimitBucket
        .deleteMany({
          where: { windowStart: { lt: new Date(now.getTime() - 2 * DAY * 1000) } },
        })
        .catch(() => undefined);
    }

    if (count > rule.limit) {
      const retryAt = new Date(start.getTime() + rule.windowSeconds * 1000);
      throw new AppError(
        `Too many attempts. Try again after ${retryAt.toISOString()}.`,
        { code: "RATE_LIMITED", statusCode: 429 },
      );
    }
  }
}

export const rateLimitService = new RateLimitService();
