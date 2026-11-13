"use client";

import { Copy, KeyRound, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ApiKeySummary = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
};

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

function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKeySummary[] | null>(null);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await callApi<{ api_keys: ApiKeySummary[] }>("/api/auth/api-keys");
    setKeys(data.api_keys);
  }, []);

  useEffect(() => {
    let cancelled = false;
    callApi<{ api_keys: ApiKeySummary[] }>("/api/auth/api-keys")
      .then((data) => {
        if (!cancelled) setKeys(data.api_keys);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setKeys([]);
        setError(err instanceof Error ? err.message : "Could not load API keys");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function createKey(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const data = await callApi<{ key: string }>("/api/auth/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setNewKey(data.key);
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create API key");
    } finally {
      setBusy(false);
    }
  }

  async function revokeKey(id: string) {
    setBusy(true);
    setError(null);
    try {
      await callApi(`/api/auth/api-keys/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke API key");
    } finally {
      setBusy(false);
    }
  }

  async function copyKey() {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        An API key lets an AI agent (Claude Code, Cursor, and others) ask questions
        about <strong>your</strong> ledger and forecast. Each key only ever reaches
        the account that created it. Treat it like a password.
      </p>

      <form onSubmit={createKey} className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Key name, e.g. My laptop"
          maxLength={60}
          aria-label="Key name"
          disabled={busy}
        />
        <Button type="submit" disabled={busy}>
          <KeyRound className="size-4" />
          Create key
        </Button>
      </form>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {newKey ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <p className="text-sm font-medium">
            Copy your key now — it will not be shown again.
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="block flex-1 break-all rounded-lg bg-background/70 px-3 py-2 font-mono text-xs">
              {newKey}
            </code>
            <Button type="button" variant="outline" onClick={() => void copyKey()}>
              <Copy className="size-4" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="mb-2 text-sm font-semibold">Active keys</h2>
        {keys === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No API keys yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {keys.map((key) => (
              <li
                key={key.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{key.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{key.key_prefix}…</span> · Created{" "}
                    {formatDate(key.created_at)} · Last used{" "}
                    {formatDate(key.last_used_at)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void revokeKey(key.id)}
                >
                  <Trash2 className="size-3.5" />
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
