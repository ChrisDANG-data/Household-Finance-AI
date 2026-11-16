import { createHash, randomInt, timingSafeEqual } from "node:crypto";

/** 30 symbols with no look-alikes (0/O, 1/I/L, U). 20 symbols ≈ 98 bits of randomness. */
const SYMBOLS = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
const CODE_LENGTH = 20;
const GROUP_SIZE = 5;

/** No shared accounts by default — every account belongs to one person. */
const DEFAULT_SHARED_ACCOUNTS = "";

/** A one-time code like `K7QMX-2HDPA-9RTWB-4ZNCE`. Shown once; only its hash is stored. */
export function generateRecoveryCode(): string {
  let raw = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    raw += SYMBOLS[randomInt(SYMBOLS.length)];
  }
  return raw.match(new RegExp(`.{${GROUP_SIZE}}`, "g"))!.join("-");
}

/** Users may type the code in lower case, with or without dashes or spaces. */
export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isWellFormedRecoveryCode(input: string): boolean {
  const normalized = normalizeRecoveryCode(input);
  return (
    normalized.length === CODE_LENGTH &&
    [...normalized].every((char) => SYMBOLS.includes(char))
  );
}

/** Codes are long random strings, so a fast hash is enough (same reasoning as API keys). */
export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(normalizeRecoveryCode(code)).digest("hex");
}

export function verifyRecoveryCode(code: string, storedHash: string | null): boolean {
  if (!storedHash || !isWellFormedRecoveryCode(code)) return false;
  const expected = Buffer.from(storedHash, "hex");
  const actual = Buffer.from(hashRecoveryCode(code), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * If you ever publish a login for a shared demo account, list its username in
 * AUTH_SHARED_ACCOUNTS="name1,name2". Password change, recovery and deletion are then
 * disabled for it, so nobody who knows the public password can take it over.
 */
export function isSharedAccount(username: string): boolean {
  const raw = process.env.AUTH_SHARED_ACCOUNTS ?? DEFAULT_SHARED_ACCOUNTS;
  const shared = raw
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
  return shared.includes(username.trim().toLowerCase());
}
