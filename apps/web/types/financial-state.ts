/**
 * Re-exports canonical Financial State types for API and cross-layer contracts.
 */

export type {
  FinancialEvent,
  FinancialEventFrequency,
  FinancialEventMetadata,
  FinancialEventType,
  RawFinancialEvent,
} from "@/services/financial-state/types";

export { DEFAULT_CURRENCY } from "@/services/financial-state/types";

export {
  normalizeFinancialEvents,
  normalizeEvents,
} from "@/services/financial-state/normalize";

export type {
  FinancialRiskMetrics,
  FinancialRiskReport,
  FinancialRiskSignals,
  RiskAnalysisContext,
} from "@/services/financial-state/risk";

export type {
  CashFlowRiskLevel,
  FinancialState,
  FinancialStateComputed,
  FinancialTimelineState,
  SimulateForecastOptions,
} from "@/services/financial-state/state.types";

/** @deprecated Persistence ingest enum; not used by the computation engine. */
export type CanonicalEventType =
  | "income"
  | "expense"
  | "transfer"
  | "obligation"
  | "adjustment";

/** @deprecated */
export interface CanonicalFinancialEvent {
  id: string;
  householdId: string;
  type: CanonicalEventType;
  amount: number;
  currency: string;
  effectiveDate: string;
  category?: string;
  sourceDocumentId?: string;
  metadata?: Record<string, unknown>;
}

/** @deprecated */
export interface IngestEventsInput {
  householdId: string;
  events: Omit<CanonicalFinancialEvent, "id">[];
  source: "document_pipeline" | "manual" | "import";
}

export interface StoredConversation {
  id: string;
  householdId: string;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: string;
  }>;
}
