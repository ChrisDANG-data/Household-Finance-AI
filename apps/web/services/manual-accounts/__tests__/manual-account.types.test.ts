import { describe, expect, it } from "vitest";

import {
  aggregateManualAccounts,
  formatSnapshotDateLabel,
  isValidSnapshotDate,
  normalizeSnapshotDate,
  type ManualAccountRecord,
} from "../manual-account.types";

function row(
  overrides: Partial<ManualAccountRecord> & {
    account_type: ManualAccountRecord["account_type"];
    balance: number;
  },
): ManualAccountRecord {
  return {
    id: overrides.id ?? "id-1",
    user_id: "user-1",
    snapshot_date: "2026-06-15",
    bank_name: overrides.bank_name ?? "RBC",
    account_name: overrides.account_name ?? "",
    account_type: overrides.account_type,
    balance: overrides.balance,
    currency: "CAD",
    holdings_notes: overrides.holdings_notes ?? null,
  };
}

describe("snapshot date helpers", () => {
  it("normalizes legacy YYYY-MM to first of month", () => {
    expect(normalizeSnapshotDate("2026-06")).toBe("2026-06-01");
    expect(normalizeSnapshotDate("2026-06-15")).toBe("2026-06-15");
  });

  it("validates calendar dates", () => {
    expect(isValidSnapshotDate("2026-06-15")).toBe(true);
    expect(isValidSnapshotDate("2026-06")).toBe(true);
    expect(isValidSnapshotDate("2026-02-30")).toBe(false);
  });

  it("formats labels for display", () => {
    expect(formatSnapshotDateLabel("2026-06-15")).toContain("2026");
    expect(formatSnapshotDateLabel("2026-06")).toContain("2026");
  });
});

describe("aggregateManualAccounts", () => {
  it("rolls up balances by disposable category", () => {
    const result = aggregateManualAccounts([
      row({ id: "c1", account_type: "checking", balance: 3000, bank_name: "TD" }),
      row({ id: "s1", account_type: "savings", balance: 5000 }),
      row({ id: "t1", account_type: "tfsa", balance: 12000, account_name: "Growth" }),
      row({ id: "w1", account_type: "wealthsimple", balance: 8000 }),
      row({ id: "cc1", account_type: "credit", balance: 450 }),
      row({ id: "m1", account_type: "mortgage", balance: 410000, bank_name: "Scotia" }),
    ]);

    expect(result.checking).toBe(3000);
    expect(result.savings).toBe(5000);
    expect(result.investment).toBe(20000);
    expect(result.credit_owed).toBe(450);
    expect(result.mortgage_total).toBe(410000);
    expect(result.account_lines).toHaveLength(6);
    expect(result.account_lines.find((l) => l.account_id === "t1")?.name).toContain(
      "TFSA",
    );
    expect(result.account_lines.find((l) => l.account_id === "m1")?.informational).toBe(
      true,
    );
  });

  it("includes holdings notes on account lines", () => {
    const result = aggregateManualAccounts([
      row({
        id: "inv1",
        account_type: "brokerage",
        balance: 15000,
        account_name: "Non-reg",
        holdings_notes: "VFV, XEQT",
      }),
    ]);

    expect(result.account_lines[0].holdings_notes).toBe("VFV, XEQT");
  });
});
