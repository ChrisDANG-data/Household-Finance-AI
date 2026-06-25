import type { FinancialState } from "@/services/financial-state/state.types";

import { tryCategoryCoverageAnswer, tryCategoryPaymentAnswer } from "./category-lookup";
import { tryDeterministicMonthAnswer } from "./monthly-lookup";
import { tryPartnerLedgerAnswer } from "./partner-ledger-lookup";

export interface DeterministicLedgerOptions {
  state?: FinancialState;
  startMonth?: string;
  forecastMonths?: number;
}

/**
 * Fast ledger paths with no LLM — partner, category payment, monthly totals.
 */
export async function tryDeterministicLedgerAnswer(
  message: string,
  options?: DeterministicLedgerOptions,
): Promise<string | null> {
  const coverageAnswer = await tryCategoryCoverageAnswer(message);
  if (coverageAnswer) return coverageAnswer;

  const partnerAnswer = await tryPartnerLedgerAnswer(message);
  if (partnerAnswer) return partnerAnswer;

  const monthAnswer = await tryDeterministicMonthAnswer(message, options);
  if (monthAnswer) return monthAnswer;

  const categoryAnswer = await tryCategoryPaymentAnswer(message);
  if (categoryAnswer) return categoryAnswer;

  return null;
}
