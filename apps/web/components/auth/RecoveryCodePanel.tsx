"use client";

import { Copy, LifeBuoy } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RecoveryStatus = { available: boolean; has_recovery_code: boolean };

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

export function RecoveryCodePanel() {
  const [status, setStatus] = useState<RecoveryStatus | null>(null);
  const [password, setPassword] = useState("");
  const [newCode, setNewCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    callApi<RecoveryStatus>("/api/auth/recovery-code")
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus({ available: false, has_recovery_code: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function createCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const data = await callApi<{ recovery_code: string }>(
        "/api/auth/recovery-code",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        },
      );
      setNewCode(data.recovery_code);
      setPassword("");
      setStatus({ available: true, has_recovery_code: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create a recovery code",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!newCode) return;
    try {
      await navigator.clipboard.writeText(newCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  // Hidden for shared demo accounts and when login is turned off.
  if (!status?.available) return null;

  return (
    <div className="mt-8 space-y-4 border-t border-border pt-8">
      <div>
        <h2 className="text-sm font-semibold">Password recovery code</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Passwords can’t be recovered, so save yours somewhere safe. A recovery
          code is the only way to reset a forgotten password.{" "}
          {status.has_recovery_code
            ? "You already have one. Creating a new code replaces it."
            : "You don’t have one yet — create it now."}
        </p>
      </div>

      <form onSubmit={createCode} className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Current password"
          autoComplete="current-password"
          aria-label="Current password"
          disabled={busy}
          required
        />
        <Button type="submit" disabled={busy}>
          <LifeBuoy className="size-4" />
          {status.has_recovery_code ? "Replace code" : "Create code"}
        </Button>
      </form>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {newCode ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <p className="text-sm font-medium">
            Save this code now — it will not be shown again.
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="block flex-1 break-all rounded-lg bg-background/70 px-3 py-2 font-mono text-sm">
              {newCode}
            </code>
            <Button type="button" variant="outline" onClick={() => void copyCode()}>
              <Copy className="size-4" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
