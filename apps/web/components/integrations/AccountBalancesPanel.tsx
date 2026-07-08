"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { BalanceSourceSelector } from "@/components/integrations/BalanceSourceSelector";
import { DisposableAssetsCard } from "@/components/integrations/DisposableAssetsCard";
import { ManualAccountBalancesForm } from "@/components/integrations/ManualAccountBalancesForm";
import { PlaidBalanceLineChart } from "@/components/integrations/PlaidBalanceLineChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchManualBalanceHistory,
  fetchPlaidBalanceHistory,
  syncPlaidBalances,
  type PlaidBalanceHistoryResponse,
} from "@/lib/api/client";
import type { BalanceSource } from "@/services/financial-state/state.types";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDelta(delta: number | null): string {
  if (delta == null) return "—";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${formatMoney(delta)}`;
}

export function AccountBalancesPanel() {
  const router = useRouter();
  const [balanceSource, setBalanceSource] = useState<BalanceSource>("manual");
  const [sourceLoading, setSourceLoading] = useState(true);
  const [sourceSaving, setSourceSaving] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [data, setData] = useState<PlaidBalanceHistoryResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disposableRefresh, setDisposableRefresh] = useState(0);

  const loadSource = useCallback(async () => {
    setSourceLoading(true);
    try {
      const res = await fetch("/api/financial-state/state");
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Could not load settings");
      }
      setBalanceSource(json.data.state.balance_source ?? "manual");
      setSourceError(null);
    } catch (err) {
      setSourceError(err instanceof Error ? err.message : "Could not load settings");
    } finally {
      setSourceLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const history =
        balanceSource === "manual"
          ? await fetchManualBalanceHistory()
          : await fetchPlaidBalanceHistory();
      setData(history);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load history");
    }
  }, [balanceSource]);

  useEffect(() => {
    void loadSource();
  }, [loadSource]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory, disposableRefresh]);

  async function handleSourceChange(next: BalanceSource) {
    if (next === balanceSource) return;
    setSourceSaving(true);
    setSourceError(null);
    try {
      const stateRes = await fetch("/api/financial-state/state");
      const stateJson = await stateRes.json();
      if (!stateJson.success) {
        throw new Error(stateJson.error?.message ?? "Could not load state");
      }
      const state = stateJson.data.state;
      const res = await fetch("/api/financial-state/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_cash: state.current_cash,
          balance_source: next,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Could not save preference");
      }
      setBalanceSource(next);
      setDisposableRefresh((n) => n + 1);
      router.refresh();
    } catch (err) {
      setSourceError(err instanceof Error ? err.message : "Could not save preference");
    } finally {
      setSourceSaving(false);
    }
  }

  async function runSync(force = true) {
    setBusy(true);
    setError(null);
    try {
      await syncPlaidBalances({ force });
      await loadHistory();
      setDisposableRefresh((n) => n + 1);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  function handleManualSaved() {
    setDisposableRefresh((n) => n + 1);
    void loadHistory();
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {sourceLoading ? (
        <p className="text-sm text-muted-foreground">Loading balance settings…</p>
      ) : (
        <BalanceSourceSelector
          value={balanceSource}
          disabled={sourceSaving}
          onChange={(next) => void handleSourceChange(next)}
        />
      )}
      {sourceError ? (
        <p className="text-sm text-destructive" role="alert">
          {sourceError}
        </p>
      ) : null}

      {balanceSource === "manual" ? (
        <ManualAccountBalancesForm onSaved={handleManualSaved} />
      ) : null}

      <DisposableAssetsCard
        refreshKey={disposableRefresh}
        balanceSource={balanceSource}
        onSynced={() => {
          void loadHistory();
          setDisposableRefresh((n) => n + 1);
        }}
      />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Balance trends by account</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {balanceSource === "manual"
                ? "Tracks each saved manual snapshot by date and account. Save multiple snapshots to see trends over time."
                : "Stored separately from forecast. Each sync records balance, year, month, date, and change vs the previous reading for that account."}
            </p>
          </div>
          {balanceSource === "plaid" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void runSync(true)}
            >
              <RefreshCw className="mr-2 size-4" />
              Sync now
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <PlaidBalanceLineChart
            series={data?.series ?? []}
            emptyMessage={
              balanceSource === "manual"
                ? "No balance history yet. Save a manual snapshot above to start tracking trends."
                : "No balance history yet. Connect Plaid and run a sync to start tracking."
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Snapshot history</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {!data?.recent.length ? (
            <p className="text-sm text-muted-foreground">No snapshots stored yet.</p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Date</th>
                  <th className="pb-2 pr-3 font-medium">Year</th>
                  <th className="pb-2 pr-3 font-medium">Month</th>
                  <th className="pb-2 pr-3 font-medium">Account</th>
                  <th className="pb-2 pr-3 font-medium text-right">Balance</th>
                  <th className="pb-2 font-medium text-right">Δ vs last</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-mono text-xs">{row.snapshot_date}</td>
                    <td className="py-2 pr-3">{row.year}</td>
                    <td className="py-2 pr-3">{row.month}</td>
                    <td className="py-2 pr-3">{row.account_name}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {formatMoney(row.balance)}
                    </td>
                    <td
                      className={`py-2 text-right tabular-nums ${
                        row.balance_delta != null && row.balance_delta < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : row.balance_delta != null && row.balance_delta > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : ""
                      }`}
                    >
                      {formatDelta(row.balance_delta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
