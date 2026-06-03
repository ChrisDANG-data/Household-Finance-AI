import type { DbFinancialObligation } from "@/lib/prisma-types";

import type { FinancialEvent, FinancialEventFrequency } from "./types";

const FREQUENCIES: FinancialEventFrequency[] = [
  "monthly",
  "weekly",
  "yearly",
  "quarterly",
  "one_time",
];

export function isValidFrequency(
  value: string,
): value is FinancialEventFrequency {
  return FREQUENCIES.includes(value as FinancialEventFrequency);
}

export function obligationToFinancialEvent(
  obligation: DbFinancialObligation,
): FinancialEvent {
  const frequency = obligation.frequency as FinancialEventFrequency;
  const type =
    frequency === "one_time" ? "one_time_expense" : "recurring_expense";

  return {
    id: obligation.id,
    type,
    category: obligation.category,
    amount: Number(obligation.amount),
    currency: obligation.currency,
    frequency: obligation.frequency as FinancialEventFrequency,
    start_date: obligation.startDate,
    end_date: obligation.endDate,
    owner: "joint",
    confidence: 1,
    source_document_id: obligation.sourceDocumentId,
    metadata: {
      contract_name: obligation.name,
      is_fixed: true,
    },
  };
}
