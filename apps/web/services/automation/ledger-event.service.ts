import { serializeFinancialEvent } from "@/lib/serializers/financial-state";
import {
  DEFAULT_USER_ID,
  financialStatePersistence,
} from "@/services/financial-state/financial-state.persistence";
import type {
  FinancialEventFrequency,
  FinancialEventOwner,
  FinancialEventType,
} from "@/services/financial-state/types";
import { AppError } from "@/utils/errors";

export type LedgerEventKind = "income" | "expense" | "investment";

export interface LedgerEventAutomationInput {
  user_id?: string;
  kind: LedgerEventKind;
  category: string;
  amount: number;
  frequency?: string;
  /** Optional month hint: "2026-05", "May", "May 2026" — implies one_time when frequency omitted */
  month?: string;
  start_date?: string;
  end_date?: string | null;
  currency?: string;
  owner?: string;
  confirm?: boolean;
}

export interface LedgerEventPreview {
  user_id: string;
  kind: LedgerEventKind;
  type: FinancialEventType;
  category: string;
  amount: number;
  currency: string;
  frequency: FinancialEventFrequency;
  start_date: string;
  end_date: string | null;
  owner: FinancialEventOwner;
}

export interface LedgerEventAutomationResult {
  status: "preview" | "saved";
  reply: string;
  preview: LedgerEventPreview;
  event?: ReturnType<typeof serializeFinancialEvent>;
}

const KIND_LABELS: Record<LedgerEventKind, string> = {
  income: "income",
  expense: "expense",
  investment: "investment",
};

const FREQUENCY_ALIASES: Record<string, FinancialEventFrequency> = {
  monthly: "monthly",
  month: "monthly",
  weekly: "weekly",
  week: "weekly",
  yearly: "yearly",
  annual: "yearly",
  year: "yearly",
  quarterly: "quarterly",
  quarter: "quarterly",
  one_time: "one_time",
  once: "one_time",
  onetime: "one_time",
};

const VALID_OWNERS: FinancialEventOwner[] = ["partner_a", "partner_b", "joint"];

function normalizeFrequency(raw: unknown): FinancialEventFrequency {
  if (typeof raw !== "string" || !raw.trim()) return "monthly";
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
  return FREQUENCY_ALIASES[key] ?? "monthly";
}

const MONTH_NAMES: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

function normalizeOwner(raw: unknown): FinancialEventOwner {
  if (typeof raw !== "string" || !raw.trim()) return "partner_a";
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (key === "joint") return "joint";
  if (key.includes("partner_b") || key === "b" || key.endsWith("_b")) return "partner_b";
  if (key.includes("partner_a") || key === "a" || key.endsWith("_a")) return "partner_a";
  return VALID_OWNERS.includes(key as FinancialEventOwner)
    ? (key as FinancialEventOwner)
    : "partner_a";
}

function parseMonthHint(raw: string, referenceYear = new Date().getUTCFullYear()): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const isoMonth = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (isoMonth) {
    return `${isoMonth[1]}-${isoMonth[2]}-01`;
  }

  const monthYear = trimmed.match(/^([a-z]+)\s+(\d{4})$/i);
  if (monthYear) {
    const month = MONTH_NAMES[monthYear[1]!.toLowerCase()];
    if (month) return `${monthYear[2]}-${String(month).padStart(2, "0")}-01`;
  }

  const monthOnly = MONTH_NAMES[trimmed.toLowerCase()];
  if (monthOnly) {
    return `${referenceYear}-${String(monthOnly).padStart(2, "0")}-01`;
  }

  return null;
}

function resolveFrequency(
  frequencyRaw: unknown,
  monthHint?: string,
): FinancialEventFrequency {
  if (typeof frequencyRaw === "string" && frequencyRaw.trim()) {
    return normalizeFrequency(frequencyRaw);
  }
  if (monthHint?.trim()) return "one_time";
  return "monthly";
}

function defaultStartDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function resolveEventType(
  kind: LedgerEventKind,
  frequency: FinancialEventFrequency,
): FinancialEventType {
  if (kind === "income") return "income";
  if (kind === "investment") return "investment";
  return frequency === "one_time" ? "one_time_expense" : "recurring_expense";
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function buildSummary(preview: LedgerEventPreview): string {
  const money = formatMoney(preview.amount, preview.currency);
  const freq =
    preview.frequency === "one_time" ? "one-time" : preview.frequency;
  let summary = `${KIND_LABELS[preview.kind]} ${preview.category} ${money} (${freq}, from ${preview.start_date}`;
  if (preview.end_date) {
    summary += ` to ${preview.end_date}`;
  }
  summary += ")";
  return summary;
}

function parsePreview(input: LedgerEventAutomationInput): LedgerEventPreview {
  const kind = input.kind;
  if (!kind || !["income", "expense", "investment"].includes(kind)) {
    throw new AppError("kind must be income, expense, or investment", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  const category = input.category?.trim();
  if (!category) {
    throw new AppError("category is required", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError("amount must be a positive number", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  const monthFromHint = input.month ? parseMonthHint(input.month) : null;
  const frequency = resolveFrequency(input.frequency, input.month);
  const currency = input.currency?.trim().toUpperCase() || "CAD";
  const startDate =
    input.start_date?.trim() || monthFromHint || defaultStartDate();
  const endDate = input.end_date?.trim() || null;

  return {
    user_id: input.user_id ?? DEFAULT_USER_ID,
    kind,
    type: resolveEventType(kind, frequency),
    category,
    amount: Number(amount.toFixed(2)),
    currency,
    frequency,
    start_date: startDate,
    end_date: endDate,
    owner: normalizeOwner(input.owner),
  };
}

export class LedgerEventAutomationService {
  async handle(input: LedgerEventAutomationInput): Promise<LedgerEventAutomationResult> {
    const preview = parsePreview(input);
    const summary = buildSummary(preview);
    const confirm = input.confirm ?? true;

    if (!confirm) {
      return {
        status: "preview",
        reply: `Save ${summary}? Reply yes to confirm.`,
        preview,
      };
    }

    const event = await financialStatePersistence.createEvent({
      user_id: preview.user_id,
      type: preview.type,
      category: preview.category,
      amount: preview.amount,
      currency: preview.currency,
      frequency: preview.frequency,
      start_date: preview.start_date,
      end_date: preview.end_date,
      owner: preview.owner,
      confidence: 1,
    });

    return {
      status: "saved",
      reply: `Saved: ${summary}`,
      preview,
      event: serializeFinancialEvent(event),
    };
  }
}

export const ledgerEventAutomationService = new LedgerEventAutomationService();
