import type { FinancialEvent as PrismaFinancialEvent, Prisma } from "@prisma/client";

import type {
  FinancialEvent,
  FinancialEventFrequency,
  FinancialEventMetadata,
  FinancialEventType,
} from "./types";

export function parseEventMetadata(value: Prisma.JsonValue): FinancialEventMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const record = value as Record<string, unknown>;
  return {
    ...(typeof record.merchant === "string" && { merchant: record.merchant }),
    ...(typeof record.contract_name === "string" && {
      contract_name: record.contract_name,
    }),
    ...(typeof record.is_fixed === "boolean" && { is_fixed: record.is_fixed }),
  };
}

export function metadataToJson(
  metadata: FinancialEventMetadata,
): Prisma.InputJsonValue {
  return {
    ...(metadata.merchant !== undefined ? { merchant: metadata.merchant } : {}),
    ...(metadata.contract_name !== undefined
      ? { contract_name: metadata.contract_name }
      : {}),
    ...(metadata.is_fixed !== undefined ? { is_fixed: metadata.is_fixed } : {}),
  } as Prisma.InputJsonValue;
}

export function prismaEventToDomain(row: PrismaFinancialEvent): FinancialEvent {
  return {
    id: row.id,
    type: row.type as FinancialEventType,
    category: row.category,
    amount: Number(row.amount),
    currency: row.currency,
    frequency: row.frequency as FinancialEventFrequency,
    start_date: row.startDate,
    end_date: row.endDate,
    confidence: row.confidence,
    source_document_id: row.sourceDocumentId,
    metadata: parseEventMetadata(row.metadata),
  };
}
