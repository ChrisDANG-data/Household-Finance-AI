import { describe, expect, it } from "vitest";

import { computeDisposableAssets } from "../disposable-assets.service";

describe("computeDisposableAssets", () => {
  const accounts = [
    {
      account_id: "chk",
      type: "depository",
      subtype: "checking",
      available: 5000,
      current: 5000,
      iso_currency_code: "CAD",
    },
    {
      account_id: "sav",
      type: "depository",
      subtype: "savings",
      available: 8000,
      current: 8000,
      iso_currency_code: "CAD",
    },
    {
      account_id: "cash",
      type: "depository",
      subtype: "cash management",
      available: 2000,
      current: 2000,
      iso_currency_code: "CAD",
    },
    {
      account_id: "inv",
      type: "investment",
      subtype: "brokerage",
      available: 15000,
      current: 15000,
      iso_currency_code: "CAD",
    },
    {
      account_id: "cc",
      type: "credit",
      subtype: "credit card",
      available: null,
      current: 1200,
      iso_currency_code: "CAD",
    },
    {
      account_id: "mtg",
      type: "loan",
      subtype: "mortgage",
      available: null,
      current: 320000,
      iso_currency_code: "CAD",
    },
  ];

  it("computes disposable from Plaid assets plus ledger month flow", () => {
    const summary = computeDisposableAssets({
      as_of: "2026-06-30T23:00:00.000Z",
      month: "2026-06",
      balance_source: "plaid",
      plaid_connected: true,
      plaid_accounts: accounts,
      month_income: 12000,
      month_expenses: 4500,
      month_investment: 1000,
    });

    expect(summary.checking_total).toBe(5000);
    expect(summary.savings_total).toBe(8000);
    expect(summary.cash_management_total).toBe(2000);
    expect(summary.investment_total).toBe(15000);
    expect(summary.plaid_assets_total).toBe(30000);
    expect(summary.credit_owed).toBe(1200);
    expect(summary.month_income).toBe(12000);
    expect(summary.month_expenses).toBe(4500);
    expect(summary.month_investment).toBe(1000);
    expect(summary.disposable_total).toBe(36500);
    expect(summary.mortgage_total).toBe(320000);
    expect(summary.mortgage_lines).toHaveLength(1);
    expect(summary.account_lines.some((l) => l.category === "mortgage")).toBe(
      false,
    );
  });

  it("uses ledger flow when Plaid is not linked", () => {
    const summary = computeDisposableAssets({
      as_of: "2026-06-30T23:00:00.000Z",
      balance_source: "plaid",
      plaid_connected: false,
      plaid_accounts: [],
      month_income: 8000,
      month_expenses: 3000,
      month_investment: 500,
    });

    expect(summary.plaid_assets_total).toBe(0);
    expect(summary.disposable_total).toBe(4500);
    expect(summary.notes.some((n) => n.includes("Manual mode"))).toBe(true);
  });

  it("computes disposable from manual balances plus ledger month flow", () => {
    const manualLines = [
      {
        account_id: "a1",
        name: "RBC · Chequing (Checking)",
        subtype: "checking",
        category: "checking" as const,
        balance: 4000,
        currency: "CAD",
      },
      {
        account_id: "a2",
        name: "RBC · Savings (Savings)",
        subtype: "savings",
        category: "savings" as const,
        balance: 6000,
        currency: "CAD",
      },
      {
        account_id: "a3",
        name: "Wealthsimple (Wealthsimple)",
        subtype: "wealthsimple",
        category: "investment" as const,
        balance: 6000,
        currency: "CAD",
        holdings_notes: "XEQT",
      },
    ];

    const summary = computeDisposableAssets({
      as_of: "2026-06-30T23:00:00.000Z",
      month: "2026-06",
      balance_source: "manual",
      plaid_connected: false,
      plaid_accounts: [],
      manual_balances: {
        checking: 4000,
        savings: 6000,
        cash_management: 1000,
        investment: 5000,
        credit_owed: 800,
      },
      manual_account_lines: manualLines,
      manual_mortgage_total: 0,
      manual_snapshot_date: "2026-06-15",
      month_income: 10000,
      month_expenses: 3500,
      month_investment: 500,
    });

    expect(summary.balance_source).toBe("manual");
    expect(summary.plaid_assets_total).toBe(16000);
    expect(summary.disposable_total).toBe(22000);
    expect(summary.credit_owed).toBe(800);
    expect(summary.account_lines).toHaveLength(3);
    expect(summary.notes.some((n) => n.includes("2026-06-15"))).toBe(true);
  });
});
