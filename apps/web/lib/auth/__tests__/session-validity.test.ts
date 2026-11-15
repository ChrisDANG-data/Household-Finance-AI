import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ user: { findUnique: vi.fn() } }));

vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { isSessionStillValid } from "@/lib/auth/request-user";
import { sessionIssuedAt, type SessionPayload } from "@/lib/auth/session";

const ISSUED = 1_800_000_000;
const payload: SessionPayload = {
  sub: "user_1",
  username: "alice",
  iat: ISSUED,
  exp: ISSUED + 7 * 24 * 60 * 60,
};

describe("session validity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a session whose account was deleted", async () => {
    db.user.findUnique.mockResolvedValue(null);
    await expect(isSessionStillValid(payload)).resolves.toBe(false);
  });

  it("accepts a session for an account that never changed its password", async () => {
    db.user.findUnique.mockResolvedValue({ sessionsValidAfter: null });
    await expect(isSessionStillValid(payload)).resolves.toBe(true);
  });

  it("rejects sessions issued before a password change and accepts later ones", async () => {
    db.user.findUnique.mockResolvedValue({
      sessionsValidAfter: new Date((ISSUED + 60) * 1000),
    });
    await expect(isSessionStillValid(payload)).resolves.toBe(false);

    db.user.findUnique.mockResolvedValue({
      sessionsValidAfter: new Date(ISSUED * 1000),
    });
    await expect(isSessionStillValid(payload)).resolves.toBe(true);
  });

  it("works out the issue time for older tokens without iat", () => {
    const { iat: _iat, ...legacy } = payload;
    void _iat;
    expect(sessionIssuedAt(legacy)).toBe(ISSUED);
    expect(sessionIssuedAt(payload)).toBe(ISSUED);
  });

  it("does not lock everyone out before the new column exists", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    db.user.findUnique.mockRejectedValue(
      Object.assign(new Error("missing column"), { code: "P2022" }),
    );
    await expect(isSessionStillValid(payload)).resolves.toBe(true);
    warn.mockRestore();

    db.user.findUnique.mockRejectedValue(new Error("connection lost"));
    await expect(isSessionStillValid(payload)).rejects.toThrow(/connection lost/);
  });
});
