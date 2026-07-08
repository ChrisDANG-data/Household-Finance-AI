"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Plus, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  MANUAL_ACCOUNT_TYPE_LABELS,
  MANUAL_ACCOUNT_TYPES,
  formatSnapshotDateLabel,
  type ManualAccountInput,
  type ManualAccountRecord,
  type ManualAccountType,
} from "@/services/manual-accounts/manual-account.types";

interface FormRow {
  key: string;
  bank_name: string;
  account_name: string;
  account_type: ManualAccountType;
  balance: string;
  holdings_notes: string;
}

interface ManualAccountBalancesFormProps {
  onSaved?: () => void;
}

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function currentDateValue(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function emptyRow(): FormRow {
  return {
    key: crypto.randomUUID(),
    bank_name: "",
    account_name: "",
    account_type: "checking",
    balance: "",
    holdings_notes: "",
  };
}

function recordToRow(record: ManualAccountRecord): FormRow {
  return {
    key: record.id,
    bank_name: record.bank_name,
    account_name: record.account_name,
    account_type: record.account_type,
    balance: String(record.balance),
    holdings_notes: record.holdings_notes ?? "",
  };
}

export function ManualAccountBalancesForm({
  onSaved,
}: ManualAccountBalancesFormProps) {
  const [snapshotDate, setSnapshotDate] = useState(currentDateValue);
  const [rows, setRows] = useState<FormRow[]>([emptyRow()]);
  const [snapshotDates, setSnapshotDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async (date?: string) => {
    setLoading(true);
    setError(null);
    try {
      const query = date ? `?date=${encodeURIComponent(date)}` : "";
      const res = await fetch(`/api/financial-state/manual-accounts${query}`);
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Could not load accounts");
      }
      const loadedDate = json.data.snapshot_date as string;
      const accounts = json.data.accounts as ManualAccountRecord[];
      const dates = json.data.snapshot_dates as string[];

      setSnapshotDate(loadedDate);
      setSnapshotDates(dates);

      if (accounts.length > 0) {
        setRows(accounts.map(recordToRow));
      } else {
        const stateRes = await fetch("/api/financial-state/state");
        const stateJson = await stateRes.json();
        if (stateJson.success) {
          const manual = stateJson.data.state.manual_balances as {
            checking: number;
            savings: number;
            cash_management: number;
            investment: number;
            credit_owed: number;
          };
          const legacyRows: FormRow[] = [];
          const pushIf = (
            type: ManualAccountType,
            balance: number,
            label: string,
          ) => {
            if (balance > 0) {
              legacyRows.push({
                key: crypto.randomUUID(),
                bank_name: "Manual",
                account_name: label,
                account_type: type,
                balance: String(balance),
                holdings_notes: "",
              });
            }
          };
          pushIf("checking", manual.checking ?? 0, "Checking");
          pushIf("savings", manual.savings ?? 0, "Savings");
          pushIf("cash_management", manual.cash_management ?? 0, "Cash management");
          pushIf("investment_other", manual.investment ?? 0, "Investments");
          pushIf("credit", manual.credit_owed ?? 0, "Credit owed");
          setRows(legacyRows.length > 0 ? legacyRows : [emptyRow()]);
        } else {
          setRows([emptyRow()]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function handleSavedSnapshotSelect(date: string) {
    setSnapshotDate(date);
    void load(date);
  }

  function updateRow(key: string, patch: Partial<FormRow>) {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => {
      const next = prev.filter((row) => row.key !== key);
      return next.length > 0 ? next : [emptyRow()];
    });
  }

  const totals = useMemo(() => {
    const sums = {
      checking: 0,
      savings: 0,
      cash_management: 0,
      investment: 0,
      credit_owed: 0,
      mortgage: 0,
    };
    for (const row of rows) {
      const balance = Number(row.balance) || 0;
      if (balance < 0 || !Number.isFinite(balance)) continue;
      switch (row.account_type) {
        case "checking":
          sums.checking += balance;
          break;
        case "savings":
          sums.savings += balance;
          break;
        case "cash_management":
          sums.cash_management += balance;
          break;
        case "credit":
          sums.credit_owed += balance;
          break;
        case "mortgage":
          sums.mortgage += balance;
          break;
        case "tfsa":
        case "resp":
        case "rdsp":
        case "rrsp":
        case "brokerage":
        case "wealthsimple":
        case "investment_other":
          sums.investment += balance;
          break;
        default:
          break;
      }
    }
    const assets = roundMoney(
      sums.checking +
        sums.savings +
        sums.cash_management +
        sums.investment,
    );
    return { ...sums, assets };
  }, [rows]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const filledRows = rows.filter(
      (row) =>
        row.bank_name.trim() ||
        row.account_name.trim() ||
        row.balance.trim() ||
        row.holdings_notes.trim(),
    );

    const accounts: ManualAccountInput[] = [];
    for (let i = 0; i < filledRows.length; i++) {
      const row = filledRows[i];
      if (!row.bank_name.trim()) {
        setError(`Row ${i + 1}: bank name is required.`);
        setSaving(false);
        return;
      }
      const balance = Number(row.balance);
      if (!Number.isFinite(balance) || balance < 0) {
        setError(`Row ${i + 1}: enter a valid non-negative balance.`);
        setSaving(false);
        return;
      }
      accounts.push({
        bank_name: row.bank_name.trim(),
        account_name: row.account_name.trim(),
        account_type: row.account_type,
        balance: roundMoney(balance),
        currency: "CAD",
        holdings_notes: row.holdings_notes.trim() || null,
      });
    }

    try {
      const res = await fetch("/api/financial-state/manual-accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshot_date: snapshotDate,
          accounts,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Save failed");
      }
      setSuccess(
        `Saved ${accounts.length} account(s) for ${formatSnapshotDateLabel(snapshotDate)}. Checking feeds forecast opening cash.`,
      );
      setSnapshotDates((prev) =>
        prev.includes(snapshotDate)
          ? prev
          : [snapshotDate, ...prev].sort().reverse(),
      );
      onSaved?.();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Manual account balances</CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter balances by snapshot date, bank, and account type (checking,
          savings, TFSA, RESP, RDSP, Wealthsimple, etc.). You can save multiple
          snapshots in the same month (e.g. June 1 and June 15). Optional holdings
          notes for investments. Checking totals feed the forecast opening cash.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Snapshot date</span>
                <input
                  type="date"
                  value={snapshotDate}
                  onChange={(e) => setSnapshotDate(e.target.value)}
                  className={SELECT_CLASS}
                />
              </label>
              {snapshotDates.length > 0 ? (
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">Saved snapshots</span>
                  <select
                    value={snapshotDate}
                    onChange={(e) => handleSavedSnapshotSelect(e.target.value)}
                    className={SELECT_CLASS}
                  >
                    {snapshotDates.map((d) => (
                      <option key={d} value={d}>
                        {formatSnapshotDateLabel(d)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Bank</th>
                    <th className="px-2 py-2 font-medium">Account label</th>
                    <th className="px-2 py-2 font-medium">Type</th>
                    <th className="px-2 py-2 font-medium text-right">Balance (CAD)</th>
                    <th className="px-2 py-2 font-medium">Holdings (optional)</th>
                    <th className="px-2 py-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.key} className="border-b border-border/60 align-top">
                      <td className="px-2 py-2">
                        <Input
                          value={row.bank_name}
                          placeholder="e.g. RBC"
                          onChange={(e) =>
                            updateRow(row.key, { bank_name: e.target.value })
                          }
                          aria-label={`Row ${index + 1} bank`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          value={row.account_name}
                          placeholder="e.g. Joint chequing"
                          onChange={(e) =>
                            updateRow(row.key, { account_name: e.target.value })
                          }
                          aria-label={`Row ${index + 1} account name`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={row.account_type}
                          onChange={(e) =>
                            updateRow(row.key, {
                              account_type: e.target.value as ManualAccountType,
                            })
                          }
                          className={SELECT_CLASS}
                          aria-label={`Row ${index + 1} account type`}
                        >
                          {MANUAL_ACCOUNT_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {MANUAL_ACCOUNT_TYPE_LABELS[type]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.balance}
                          onChange={(e) =>
                            updateRow(row.key, { balance: e.target.value })
                          }
                          className="text-right"
                          aria-label={`Row ${index + 1} balance`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          value={row.holdings_notes}
                          placeholder="e.g. VFV, XEQT"
                          onChange={(e) =>
                            updateRow(row.key, { holdings_notes: e.target.value })
                          }
                          aria-label={`Row ${index + 1} holdings`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(row.key)}
                          aria-label={`Remove row ${index + 1}`}
                        >
                          <Trash2 className="size-4 text-muted-foreground" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="size-4" />
              Add account
            </Button>

            <div className="grid gap-2 rounded-lg border border-border bg-muted/30 px-3 py-3 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Checking</span>
                <span className="font-mono tabular-nums">
                  {new Intl.NumberFormat("en-CA", {
                    style: "currency",
                    currency: "CAD",
                  }).format(totals.checking)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Savings</span>
                <span className="font-mono tabular-nums">
                  {new Intl.NumberFormat("en-CA", {
                    style: "currency",
                    currency: "CAD",
                  }).format(totals.savings)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Investments</span>
                <span className="font-mono tabular-nums">
                  {new Intl.NumberFormat("en-CA", {
                    style: "currency",
                    currency: "CAD",
                  }).format(totals.investment)}
                </span>
              </div>
              <div className="flex justify-between gap-2 font-semibold">
                <span>Total assets (excl. credit)</span>
                <span className="font-mono tabular-nums">
                  {new Intl.NumberFormat("en-CA", {
                    style: "currency",
                    currency: "CAD",
                  }).format(totals.assets)}
                </span>
              </div>
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            {success ? (
              <p
                className="flex items-center gap-1.5 text-sm text-emerald-600"
                role="status"
              >
                <CheckCircle2 className="size-4" />
                {success}
              </p>
            ) : null}

            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {saving ? "Saving…" : "Save snapshot"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
