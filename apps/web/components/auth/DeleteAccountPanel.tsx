"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifyAuthSessionChanged } from "@/lib/auth/auth-events";

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

export function DeleteAccountPanel() {
  const router = useRouter();
  const [available, setAvailable] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Same rule as recovery codes: hidden for shared demo accounts and when login is off.
    callApi<{ available: boolean }>("/api/auth/recovery-code")
      .then((data) => {
        if (!cancelled) setAvailable(data.available);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function deleteAccount(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await callApi("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      notifyAuthSessionChanged();
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the account");
      setBusy(false);
    }
  }

  if (!available) return null;

  return (
    <div className="mt-8 space-y-4 border-t border-border pt-8">
      <div>
        <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">
          Delete account
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently deletes your account and everything stored for it: ledger
          entries, balances, uploaded documents, bank links, and API keys. This
          can’t be undone.
        </p>
      </div>

      {confirming ? (
        <form onSubmit={deleteAccount} className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
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
            <Button type="submit" variant="destructive" disabled={busy}>
              <Trash2 className="size-4" />
              {busy ? "Deleting…" : "Delete everything"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setConfirming(false);
                setPassword("");
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
        </form>
      ) : (
        <Button type="button" variant="outline" onClick={() => setConfirming(true)}>
          <Trash2 className="size-4" />
          Delete my account…
        </Button>
      )}
    </div>
  );
}
