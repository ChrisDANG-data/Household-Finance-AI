import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  normalizeUsername,
  validatePassword,
  validateUsername,
  verifyPassword,
} from "@/lib/auth/password";
import {
  generateRecoveryCode,
  hashRecoveryCode,
  isSharedAccount,
  verifyRecoveryCode,
} from "@/lib/auth/recovery-code";
import { AppError } from "@/utils/errors";

export interface AuthUser {
  id: string;
  username: string;
}

/** Returned once, right after the code is created — it is never stored in readable form. */
export interface AuthUserWithRecoveryCode extends AuthUser {
  recoveryCode: string;
}

export class UserAuthService {
  async findByUsername(username: string): Promise<{
    id: string;
    username: string;
    passwordHash: string;
  } | null> {
    const normalized = normalizeUsername(username);
    return prisma.user.findUnique({
      where: { username: normalized },
      select: { id: true, username: true, passwordHash: true },
    });
  }

  async authenticate(
    username: string,
    password: string,
  ): Promise<AuthUser | null> {
    const user = await this.findByUsername(username);
    if (!user) return null;
    if (!verifyPassword(password, user.passwordHash)) return null;
    return { id: user.id, username: user.username };
  }

  async register(
    username: string,
    password: string,
  ): Promise<AuthUserWithRecoveryCode> {
    const usernameError = validateUsername(username);
    if (usernameError) {
      throw new AppError(usernameError, {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      throw new AppError(passwordError, {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    const normalized = normalizeUsername(username);
    const existing = await prisma.user.findUnique({
      where: { username: normalized },
      select: { id: true },
    });
    if (existing) {
      throw new AppError("Username is already taken", {
        code: "VALIDATION_ERROR",
        statusCode: 409,
      });
    }

    const recoveryCode = generateRecoveryCode();
    const user = await prisma.user.create({
      data: {
        username: normalized,
        passwordHash: hashPassword(password),
        recoveryCodeHash: hashRecoveryCode(recoveryCode),
      },
      select: { id: true, username: true },
    });

    return { ...user, recoveryCode };
  }

  /**
   * Set a new password using the recovery code. The code is single-use:
   * a new one is issued and returned. Errors never reveal whether the username exists.
   */
  async resetPasswordWithRecoveryCode(
    username: string,
    recoveryCode: string,
    newPassword: string,
  ): Promise<AuthUserWithRecoveryCode> {
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      throw new AppError(passwordError, {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    const invalid = new AppError("Invalid username or recovery code", {
      code: "UNAUTHORIZED",
      statusCode: 401,
    });

    const normalized = normalizeUsername(username);
    if (!normalized || isSharedAccount(normalized)) throw invalid;

    const user = await prisma.user.findUnique({
      where: { username: normalized },
      select: { id: true, username: true, recoveryCodeHash: true },
    });
    if (!user || !verifyRecoveryCode(recoveryCode, user.recoveryCodeHash)) {
      throw invalid;
    }

    const nextCode = generateRecoveryCode();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashPassword(newPassword),
        recoveryCodeHash: hashRecoveryCode(nextCode),
      },
    });

    return { id: user.id, username: user.username, recoveryCode: nextCode };
  }

  /** Whether the signed-in user can use / create a recovery code. */
  async getRecoveryStatus(userId: string): Promise<{
    available: boolean;
    has_recovery_code: boolean;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, recoveryCodeHash: true },
    });
    if (!user || isSharedAccount(user.username)) {
      return { available: false, has_recovery_code: false };
    }
    return { available: true, has_recovery_code: Boolean(user.recoveryCodeHash) };
  }

  /** Issue a new recovery code (replaces the old one). Requires the current password. */
  async regenerateRecoveryCode(
    userId: string,
    currentPassword: string,
  ): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, passwordHash: true },
    });
    if (!user) {
      throw new AppError("Account not found", {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }
    if (isSharedAccount(user.username)) {
      throw new AppError("Recovery codes are not available for shared demo accounts", {
        code: "FORBIDDEN",
        statusCode: 403,
      });
    }
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      throw new AppError("Current password is incorrect", {
        code: "UNAUTHORIZED",
        statusCode: 401,
      });
    }

    const recoveryCode = generateRecoveryCode();
    await prisma.user.update({
      where: { id: user.id },
      data: { recoveryCodeHash: hashRecoveryCode(recoveryCode) },
    });
    return recoveryCode;
  }

  async countUsers(): Promise<number> {
    return prisma.user.count();
  }
}

export const userAuthService = new UserAuthService();
