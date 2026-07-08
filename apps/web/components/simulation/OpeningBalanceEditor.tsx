"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { resolvePartnerOpeningBalances } from "@/services/financial-state/projection";

interface FinancialStatePayload {
  current_cash: number;
  partner_a_opening_cash: number | null;
  partner_b_opening_cash: number | null;
}

interface OpeningBalanceEditorProps {
  onSaved?: () => void;
}

function formatCad(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  }).format(value);
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function OpeningBalanceEditor({ onSaved }: OpeningBalanceEditorProps) {
  const [partnerA, setPartnerA] = useState("");
  const [partnerB, setPartnerB] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasManualSplit, setHasManualSplit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/financial-state/state");
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Could not load financial state");
      }
      const state = json.data.state as FinancialStatePayload;
      const openings = resolvePartnerOpeningBalances({
        current_cash: state.current_cash,
        partner_a_opening_cash: state.partner_a_opening_cash,
        partner_b_opening_cash: state.partner_b_opening_cash,
      });
      setPartnerA(String(openings.partnerA));
      setPartnerB(String(openings.partnerB));
      setHasManualSplit(
        state.partner_a_opening_cash != null &&
          state.partner_b_opening_cash != null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const householdTotal = roundMoney(
    (Number(partnerA) || 0) + (Number(partnerB) || 0),
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const a = Number(partnerA);
    const b = Number(partnerB);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) {
      setError("Enter valid non-negative amounts for both partners.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/financial-state/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_cash: roundMoney(a + b),
          partner_a_opening_cash: roundMoney(a),
          partner_b_opening_cash: roundMoney(b),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Save failed");
      }
      setHasManualSplit(true);
      setSuccess("Opening balances saved. Forecast refreshed.");
      onSaved?.();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function handleResetSplit() {
    const total = householdTotal;
    const half = roundMoney(total / 2);
    setPartnerA(String(half));
    setPartnerB(String(roundMoney(total - half)));
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="size-4 text-emerald-600" />
          Starting opening balances
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Without Plaid, set your current checking balance here. The forecast uses
          these values as month-one opening balances for each partner.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading balances…
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Partner A opening</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={partnerA}
                  onChange={(e) => setPartnerA(e.target.value)}
                  placeholder="0.00"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Partner B opening</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={partnerB}
                  onChange={(e) => setPartnerB(e.target.value)}
                  placeholder="0.00"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Household total</span>
              <span className="font-mono font-semibold">{formatCad(householdTotal)}</span>
            </div>

            <p className="text-xs text-muted-foreground">
              {hasManualSplit
                ? "Using your saved partner split."
                : "No custom split saved yet — defaults to 50/50 when amounts match."}
              {" "}
              <button
                type="button"
                className="text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
                onClick={handleResetSplit}
              >
                Reset to 50/50
              </button>
            </p>

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
                <Wallet className="size-4" />
              )}
              {saving ? "Saving…" : "Save opening balances"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
