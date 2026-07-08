import type { ManualAccountBalances } from "@/services/financial-state/state.types";

export type ManualDisposableCategory =
  | "checking"
  | "savings"
  | "cash_management"
  | "investment"
  | "credit"
  | "mortgage"
  | "other";

export const MANUAL_ACCOUNT_TYPES = [
  "checking",
  "savings",
  "cash_management",
  "tfsa",
  "resp",
  "rdsp",
  "rrsp",
  "brokerage",
  "wealthsimple",
  "investment_other",
  "credit",
  "mortgage",
  "other",
] as const;

export type ManualAccountType = (typeof MANUAL_ACCOUNT_TYPES)[number];

export const MANUAL_ACCOUNT_TYPE_LABELS: Record<ManualAccountType, string> = {
  checking: "Checking",
  savings: "Savings",
  cash_management: "Cash management",
  tfsa: "TFSA",
  resp: "RESP",
  rdsp: "RDSP",
  rrsp: "RRSP",
  brokerage: "Brokerage / investment",
  wealthsimple: "Wealthsimple",
  investment_other: "Other investment",
  credit: "Credit card / line of credit",
  mortgage: "Mortgage",
  other: "Other",
};

export interface ManualAccountRecord {
  id: string;
  user_id: string;
  snapshot_date: string;
  bank_name: string;
  account_name: string;
  account_type: ManualAccountType;
  balance: number;
  currency: string;
  holdings_notes: string | null;
}

export interface ManualAccountInput {
  bank_name: string;
  account_name?: string;
  account_type: ManualAccountType;
  balance: number;
  currency?: string;
  holdings_notes?: string | null;
}

export interface SaveManualSnapshotInput {
  snapshot_date: string;
  accounts: ManualAccountInput[];
}

const SNAPSHOT_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const SNAPSHOT_MONTH_RE = /^(\d{4})-(\d{2})$/;

/** Normalize legacy YYYY-MM values to YYYY-MM-01. */
export function normalizeSnapshotDate(value: string): string {
  if (SNAPSHOT_MONTH_RE.test(value)) return `${value}-01`;
  return value;
}

export function isValidSnapshotDate(value: string): boolean {
  const normalized = normalizeSnapshotDate(value);
  const match = SNAPSHOT_DATE_RE.exec(normalized);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** @deprecated Use isValidSnapshotDate */
export function isValidSnapshotMonth(value: string): boolean {
  return isValidSnapshotDate(value);
}

export function snapshotDateToLedgerMonth(value: string): string {
  return normalizeSnapshotDate(value).slice(0, 7);
}

export function formatSnapshotDateLabel(value: string): string {
  const normalized = normalizeSnapshotDate(value);
  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isValidManualAccountType(value: string): value is ManualAccountType {
  return (MANUAL_ACCOUNT_TYPES as readonly string[]).includes(value);
}

export function manualTypeToDisposableCategory(
  type: ManualAccountType,
): ManualDisposableCategory {
  switch (type) {
    case "checking":
      return "checking";
    case "savings":
      return "savings";
    case "cash_management":
      return "cash_management";
    case "credit":
      return "credit";
    case "mortgage":
      return "mortgage";
    case "tfsa":
    case "resp":
    case "rdsp":
    case "rrsp":
    case "brokerage":
    case "wealthsimple":
    case "investment_other":
      return "investment";
    default:
      return "other";
  }
}

export function aggregateManualAccounts(
  accounts: ManualAccountRecord[],
): ManualAccountBalances & {
  mortgage_total: number;
  account_lines: Array<{
    account_id: string;
    name: string;
    subtype: string | null;
    category: ManualDisposableCategory;
    balance: number;
    currency: string;
    holdings_notes?: string;
    informational?: boolean;
  }>;
} {
  const totals: ManualAccountBalances = {
    checking: 0,
    savings: 0,
    cash_management: 0,
    investment: 0,
    credit_owed: 0,
  };
  let mortgage_total = 0;

  const account_lines = accounts.map((row) => {
    const category = manualTypeToDisposableCategory(row.account_type);
    const balance = Number(row.balance.toFixed(2));
    const labelParts = [row.bank_name, row.account_name].filter(Boolean);
    const typeLabel = MANUAL_ACCOUNT_TYPE_LABELS[row.account_type];
    const name =
      labelParts.length > 0
        ? `${labelParts.join(" · ")} (${typeLabel})`
        : typeLabel;

    if (category === "checking") totals.checking += balance;
    else if (category === "savings") totals.savings += balance;
    else if (category === "cash_management") totals.cash_management += balance;
    else if (category === "investment") totals.investment += balance;
    else if (category === "credit") totals.credit_owed += balance;
    else if (category === "mortgage") mortgage_total += balance;

    return {
      account_id: row.id,
      name,
      subtype: row.account_type,
      category,
      balance,
      currency: row.currency,
      holdings_notes: row.holdings_notes ?? undefined,
      informational: category === "mortgage",
    };
  });

  for (const key of Object.keys(totals) as (keyof ManualAccountBalances)[]) {
    totals[key] = Number(totals[key].toFixed(2));
  }
  mortgage_total = Number(mortgage_total.toFixed(2));

  return { ...totals, mortgage_total, account_lines };
}
