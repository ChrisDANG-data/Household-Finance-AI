import {
  DEFAULT_USER_ID,
  financialStatePersistence,
} from "@/services/financial-state/financial-state.persistence";
import type { FinancialEvent } from "@/services/financial-state/types";
import type { IngestEventsInput } from "@/types/financial-state";
import type { RawFinancialEvent } from "@/types/financial-state";

/**
 * Financial State Engine — canonical truth layer (normalized events, accounts).
 * All writes are explicit, typed, and deterministic — never via LLM output.
 */
export class CanonicalEventService {
  async ingest(input: IngestEventsInput): Promise<FinancialEvent[]> {
    const userId = input.householdId || DEFAULT_USER_ID;
    const rawEvents: RawFinancialEvent[] = input.events.map((e) => ({
      type: e.type === "obligation" ? "recurring_expense" : e.type,
      category: e.category ?? "general",
      amount: e.amount,
      currency: e.currency,
      start_date: e.effectiveDate,
      source_document_id: e.sourceDocumentId ?? null,
      metadata: e.metadata as RawFinancialEvent["metadata"],
      confidence: 1,
      frequency: "monthly",
    }));

    return financialStatePersistence.ingestRawEvents(userId, rawEvents);
  }

  async getHouseholdLedger(householdId: string): Promise<FinancialEvent[]> {
    return financialStatePersistence.listEvents(
      householdId || DEFAULT_USER_ID,
    );
  }
}

export const canonicalEventService = new CanonicalEventService();
