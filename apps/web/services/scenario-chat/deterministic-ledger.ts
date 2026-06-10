import { tryCategoryCoverageAnswer, tryCategoryPaymentAnswer } from "./category-lookup";
import { tryDeterministicMonthAnswer } from "./monthly-lookup";
import { tryPartnerLedgerAnswer } from "./partner-ledger-lookup";

/**
 * Fast ledger paths with no LLM — partner, category payment, monthly totals.
 */
export async function tryDeterministicLedgerAnswer(
  message: string,
): Promise<string | null> {
  const coverageAnswer = await tryCategoryCoverageAnswer(message);
  if (coverageAnswer) return coverageAnswer;

  const partnerAnswer = await tryPartnerLedgerAnswer(message);
  if (partnerAnswer) return partnerAnswer;

  const categoryAnswer = await tryCategoryPaymentAnswer(message);
  if (categoryAnswer) return categoryAnswer;

  return tryDeterministicMonthAnswer(message);
}
