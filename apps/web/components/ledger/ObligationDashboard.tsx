"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createObligation,
  deleteObligation,
  updateObligation,
} from "@/lib/api/client";
import type { SerializedObligation } from "@/lib/serializers";
import type { MonthlyObligationSummary } from "@/services/financial-state/obligation-summary";
import type { FinancialEventFrequency } from "@/services/financial-state/types";

const FREQUENCIES: FinancialEventFrequency[] = [
  "monthly",
  "weekly",
  "yearly",
  "one_time",
];

interface ObligationFormState {
  name: string;
  category: string;
  amount: string;
  currency: string;
  frequency: FinancialEventFrequency;
  startDate: string;
  endDate: string;
  notes: string;
}

function emptyForm(): ObligationFormState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    name: "",
    category: "general",
    amount: "",
    currency: "CAD",
    frequency: "monthly",
    startDate: today,
    endDate: "",
    notes: "",
  };
}

function formFromObligation(o: SerializedObligation): ObligationFormState {
  return {
    name: o.name,
    category: o.category,
    amount: String(o.amount),
    currency: o.currency,
    frequency: o.frequency,
    startDate: o.startDate,
    endDate: o.endDate ?? "",
    notes: o.notes ?? "",
  };
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

interface ObligationDashboardProps {
  initialObligations: SerializedObligation[];
  initialSummary: MonthlyObligationSummary;
  month: string;
}

export function ObligationDashboard({
  initialObligations,
  initialSummary,
  month,
}: ObligationDashboardProps) {
  const router = useRouter();
  const [form, setForm] = useState<ObligationFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const obligations = initialObligations;
  const summary = initialSummary;

  const formTitle = editingId ? "Edit obligation" : "Add obligation";

  const payload = useMemo(
    () => ({
      name: form.name,
      category: form.category,
      amount: Number(form.amount),
      currency: form.currency,
      frequency: form.frequency,
      startDate: form.startDate,
      endDate: form.endDate || null,
      notes: form.notes || null,
    }),
    [form],
  );

  function resetForm() {
    setForm(emptyForm());
    setEditingId(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (editingId) {
        await updateObligation(editingId, payload);
      } else {
        await createObligation(payload);
      }
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this obligation?")) return;
    setBusy(true);
    setError(null);
    try {
      await deleteObligation(id);
      if (editingId === id) resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Total obligation outflow for{" "}
            <span className="font-mono text-foreground">{month}</span>{" "}
            (deterministic projection from stored obligations).
          </p>
          <p className="text-3xl font-semibold tracking-tight">
            {formatMoney(summary.total_monthly_obligations, "CAD")}
          </p>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>{summary.obligation_count} stored</span>
            <span>·</span>
            <span>{summary.active_obligation_ids.length} active this month</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{formTitle}</CardTitle>
          {editingId ? (
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
              Cancel edit
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">Name</span>
              <Input
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Rent, car loan, insurance…"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Amount</span>
              <Input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Currency</span>
              <Input
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value }))
                }
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Category</span>
              <Input
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Frequency</span>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                value={form.frequency}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    frequency: e.target.value as FinancialEventFrequency,
                  }))
                }
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Start date</span>
              <Input
                required
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startDate: e.target.value }))
                }
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">End date (optional)</span>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endDate: e.target.value }))
                }
              />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">Notes</span>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
              />
            </label>
            {error ? (
              <p className="text-sm text-destructive sm:col-span-2" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={busy}>
                <Plus className="size-4" />
                {busy ? "Saving…" : editingId ? "Save changes" : "Add obligation"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Obligations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {obligations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No obligations yet. Add one using the form above.
            </p>
          ) : (
            obligations.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-4"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{o.name}</h3>
                    <Badge variant="outline">{o.frequency}</Badge>
                    {summary.active_obligation_ids.includes(o.id) ? (
                      <Badge variant="secondary">Active {month}</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {o.category} · {formatMoney(o.amount, o.currency)} · starts{" "}
                    {o.startDate}
                    {o.endDate ? ` · ends ${o.endDate}` : ""}
                  </p>
                  {o.notes ? (
                    <p className="text-xs text-muted-foreground">{o.notes}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={busy}
                    aria-label={`Edit ${o.name}`}
                    onClick={() => {
                      setEditingId(o.id);
                      setForm(formFromObligation(o));
                      setError(null);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={busy}
                    aria-label={`Delete ${o.name}`}
                    onClick={() => void handleDelete(o.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
