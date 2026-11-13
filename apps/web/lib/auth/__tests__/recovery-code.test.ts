import { afterEach, describe, expect, it } from "vitest";

import {
  generateRecoveryCode,
  hashRecoveryCode,
  isSharedAccount,
  isWellFormedRecoveryCode,
  normalizeRecoveryCode,
  verifyRecoveryCode,
} from "@/lib/auth/recovery-code";

describe("recovery code", () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("generates unique, readable, well-formed codes", () => {
    const a = generateRecoveryCode();
    const b = generateRecoveryCode();
    expect(a).toMatch(/^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/);
    expect(a).not.toMatch(/[01ILOU]/);
    expect(a).not.toBe(b);
    expect(isWellFormedRecoveryCode(a)).toBe(true);
  });

  it("accepts the code however the user types it", () => {
    const code = generateRecoveryCode();
    const hash = hashRecoveryCode(code);
    expect(verifyRecoveryCode(code, hash)).toBe(true);
    expect(verifyRecoveryCode(code.toLowerCase(), hash)).toBe(true);
    expect(verifyRecoveryCode(` ${code.replace(/-/g, " ")} `, hash)).toBe(true);
    expect(normalizeRecoveryCode("ab-cd 2")).toBe("ABCD2");
  });

  it("rejects wrong, malformed, and missing codes", () => {
    const code = generateRecoveryCode();
    const hash = hashRecoveryCode(code);
    expect(verifyRecoveryCode(generateRecoveryCode(), hash)).toBe(false);
    expect(verifyRecoveryCode("", hash)).toBe(false);
    expect(verifyRecoveryCode("short", hash)).toBe(false);
    expect(verifyRecoveryCode(code, null)).toBe(false);
    expect(hash).not.toContain(normalizeRecoveryCode(code));
  });

  it("treats the public demo login as a shared account by default", () => {
    delete process.env.AUTH_SHARED_ACCOUNTS;
    expect(isSharedAccount("HouseholdFinance")).toBe(true);
    expect(isSharedAccount("alice")).toBe(false);

    process.env.AUTH_SHARED_ACCOUNTS = "demo, guest";
    expect(isSharedAccount("guest")).toBe(true);
    expect(isSharedAccount("householdfinance")).toBe(false);

    process.env.AUTH_SHARED_ACCOUNTS = "";
    expect(isSharedAccount("householdfinance")).toBe(false);
  });
});
