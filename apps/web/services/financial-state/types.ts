/**
 * Canonical financial event model — single source of truth for normalized data.
 * Pure types only; no AI, no database, no side effects.
 */

export const DEFAULT_CURRENCY = "CAD" as const;

export type FinancialEventType =
  | "income"
  | "recurring_expense"
  | "one_time_expense"
  | "liability"
  | "asset";

export type FinancialEventFrequency =
  | "monthly"
  | "weekly"
  | "yearly"
  | "one_time";

export interface FinancialEventMetadata {
  merchant?: string;
  contract_name?: string;
  is_fixed?: boolean;
}

export interface FinancialEvent {
  id: string;
  type: FinancialEventType;
  category: string;
  amount: number;
  currency: string;
  frequency: FinancialEventFrequency;
  start_date: Date;
  end_date?: Date | null;
  confidence: number;
  source_document_id?: string | null;
  metadata: FinancialEventMetadata;
}

/**
 * Imperfect input from AI extraction or imports — normalized by normalizeFinancialEvents().
 */
export interface RawFinancialEvent {
  id?: string;
  type?: string;
  category?: string;
  amount?: number;
  currency?: string;
  frequency?: string;
  start_date?: string | Date;
  end_date?: string | Date | null;
  confidence?: number;
  source_document_id?: string | null;
  metadata?: Record<string, unknown>;
}
