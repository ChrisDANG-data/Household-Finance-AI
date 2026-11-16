"use client";

import { KeyRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

async function callApi<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    credentials: "same-origin",
    ...init,
  });
  let payload: ApiEnvelope<T>;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error(`Request failed (${response.status})`);
  }
  if (!payload.success) throw new Error(payload.error.message);
  return payload.data;
}

export function ChangePasswordPanel() {
  const [available, setAvailable] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Hidden for shared demo accounts and when login is off.
    callApi<{ available: boolean }>("/api/auth/recovery-code")
      .then((data) => {
        if (!cancelled) setAvailable(data.available);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setDone(false);
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await callApi("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the password");
    } finally {
      setBusy(false);
    }
  }

  if (!available) return null;

  return (
    <div className="mt-8 space-y-4 border-t border-border pt-8">
      <div>
        <h2 className="text-sm font-semibold">Change password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Changing your password signs you out everywhere else. Your API keys and
          recovery code keep working.
        </p>
      </div>

      <form onSubmit={changePassword} className="space-y-2">
        <Input
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          placeholder="Current password"
          autoComplete="current-password"
          aria-label="Current password"
          disabled={busy}
          required
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="New password (8+ characters)"
            autoComplete="new-password"
            aria-label="New password"
            disabled={busy}
            required
          />
          <Input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            aria-label="Confirm new password"
            disabled={busy}
            required
          />
        </div>
        <Button type="submit" disabled={busy}>
          <KeyRound className="size-4" />
          {busy ? "Saving…" : "Change password"}
        </Button>
      </form>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      {done ? (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">
          Password changed.
        </p>
      ) : null}
    </div>
  );
}
