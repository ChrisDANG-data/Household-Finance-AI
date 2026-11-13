import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  generateRecoveryCode,
  hashRecoveryCode,
  verifyRecoveryCode,
} from "@/lib/auth/recovery-code";
import { userAuthService } from "@/services/auth/user-auth.service";

describe("password recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AUTH_SHARED_ACCOUNTS;
    db.user.update.mockResolvedValue({});
  });

  it("issues a recovery code at sign-up and stores only its hash", async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockImplementation(async ({ data }) => ({
      id: "user_1",
      username: data.username,
    }));

    const user = await userAuthService.register("Alice", "password123");

    const stored = db.user.create.mock.calls[0][0].data;
    expect(verifyRecoveryCode(user.recoveryCode, stored.recoveryCodeHash)).toBe(true);
    expect(JSON.stringify(stored)).not.toContain(user.recoveryCode);
  });

  it("resets the password with the right code and rotates the code", async () => {
    const code = generateRecoveryCode();
    db.user.findUnique.mockResolvedValue({
      id: "user_1",
      username: "alice",
      recoveryCodeHash: hashRecoveryCode(code),
    });

    const result = await userAuthService.resetPasswordWithRecoveryCode(
      "Alice",
      code.toLowerCase(),
      "new-password-1",
    );

    const update = db.user.update.mock.calls[0][0];
    expect(update.where).toEqual({ id: "user_1" });
    expect(verifyPassword("new-password-1", update.data.passwordHash)).toBe(true);
    expect(result.recoveryCode).not.toBe(code);
    expect(verifyRecoveryCode(result.recoveryCode, update.data.recoveryCodeHash)).toBe(true);
    expect(verifyRecoveryCode(code, update.data.recoveryCodeHash)).toBe(false);
  });

  it("gives the same error for a wrong code, unknown user, or account without a code", async () => {
    const code = generateRecoveryCode();
    const expected = { code: "UNAUTHORIZED", statusCode: 401 };

    db.user.findUnique.mockResolvedValue({
      id: "user_1",
      username: "alice",
      recoveryCodeHash: hashRecoveryCode(generateRecoveryCode()),
    });
    await expect(
      userAuthService.resetPasswordWithRecoveryCode("alice", code, "new-password-1"),
    ).rejects.toMatchObject(expected);

    db.user.findUnique.mockResolvedValue(null);
    await expect(
      userAuthService.resetPasswordWithRecoveryCode("nobody", code, "new-password-1"),
    ).rejects.toMatchObject(expected);

    db.user.findUnique.mockResolvedValue({
      id: "user_2",
      username: "old",
      recoveryCodeHash: null,
    });
    await expect(
      userAuthService.resetPasswordWithRecoveryCode("old", code, "new-password-1"),
    ).rejects.toMatchObject(expected);

    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("never resets the shared demo account", async () => {
    const code = generateRecoveryCode();
    db.user.findUnique.mockResolvedValue({
      id: "demo",
      username: "householdfinance",
      recoveryCodeHash: hashRecoveryCode(code),
    });

    await expect(
      userAuthService.resetPasswordWithRecoveryCode(
        "householdfinance",
        code,
        "new-password-1",
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
    await expect(
      userAuthService.regenerateRecoveryCode("demo", "householdfinanceai"),
    ).rejects.toMatchObject({ statusCode: 403 });
    await expect(userAuthService.getRecoveryStatus("demo")).resolves.toEqual({
      available: false,
      has_recovery_code: false,
    });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("rejects a weak new password before looking anything up", async () => {
    await expect(
      userAuthService.resetPasswordWithRecoveryCode("alice", "x", "short"),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", statusCode: 400 });
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("needs the current password to issue a new code", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "user_1",
      username: "alice",
      passwordHash: hashPassword("password123"),
    });

    await expect(
      userAuthService.regenerateRecoveryCode("user_1", "wrong-password"),
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(db.user.update).not.toHaveBeenCalled();

    const code = await userAuthService.regenerateRecoveryCode("user_1", "password123");
    expect(
      verifyRecoveryCode(code, db.user.update.mock.calls[0][0].data.recoveryCodeHash),
    ).toBe(true);
  });
});
