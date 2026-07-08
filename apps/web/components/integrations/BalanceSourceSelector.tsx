"use client";

import type { BalanceSource } from "@/services/financial-state/state.types";

interface BalanceSourceSelectorProps {
  value: BalanceSource;
  disabled?: boolean;
  onChange: (source: BalanceSource) => void;
}

export function BalanceSourceSelector({
  value,
  disabled,
  onChange,
}: BalanceSourceSelectorProps) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <p className="text-sm font-medium">How do you want to track balances?</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Plaid connects to your bank (paid service). Manual lets you type balances
        yourself — no Plaid subscription required.
      </p>
      <div
        className="mt-3 inline-flex rounded-lg border border-border bg-background p-0.5"
        role="group"
        aria-label="Balance source"
      >
        <SourceButton
          label="Manual entry"
          active={value === "manual"}
          disabled={disabled}
          onClick={() => onChange("manual")}
        />
        <SourceButton
          label="Plaid (bank sync)"
          active={value === "plaid"}
          disabled={disabled}
          onClick={() => onChange("plaid")}
        />
      </div>
    </div>
  );
}

function SourceButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-emerald-600 text-white shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
