import type { DbDocument, DbFinancialObligation } from "@/lib/prisma-types";
import type { FinancialEventFrequency } from "@/services/financial-state/types";

export interface SerializedDocument {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  extractionStatus: string;
  extractionError: string | null;
  extractedText: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SerializedObligation {
  id: string;
  name: string;
  category: string;
  amount: number;
  currency: string;
  frequency: FinancialEventFrequency;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  sourceDocumentId: string | null;
  createdAt: string;
  updatedAt: string;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function serializeDocument(doc: DbDocument): SerializedDocument {
  return {
    id: doc.id,
    filename: doc.filename,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    extractionStatus: doc.extractionStatus,
    extractionError: doc.extractionError,
    extractedText: doc.extractedText,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function serializeObligation(
  obligation: DbFinancialObligation,
): SerializedObligation {
  return {
    id: obligation.id,
    name: obligation.name,
    category: obligation.category,
    amount: Number(obligation.amount),
    currency: obligation.currency,
    frequency: obligation.frequency as FinancialEventFrequency,
    startDate: toDateString(obligation.startDate),
    endDate: obligation.endDate ? toDateString(obligation.endDate) : null,
    notes: obligation.notes,
    sourceDocumentId: obligation.sourceDocumentId,
    createdAt: obligation.createdAt.toISOString(),
    updatedAt: obligation.updatedAt.toISOString(),
  };
}
