import { isSimpleMonthForecastQuery } from "./monthly-lookup";

const LEDGER_PAYMENT_QUERY =
  /\b(payment|pay|amount|cost|fee|premium|charge|how much|what is my|what's my|total|closing balance|last payment|income in|expenses in)\b/i;

/**
 * Questions about policy text, coverage terms, or uploaded document content —
 * not ledger totals or payment amounts from FinancialEvent.
 */
export function isDocumentProseQuery(message: string): boolean {
  const text = message.trim().toLowerCase();

  if (
    /\b(policy number|policy #|certificate of insurance|deductible|coverage limit|beneficiary|named insured|declarations page)\b/.test(
      text,
    )
  ) {
    return true;
  }

  if (
    /\b(what does|what do) (my|the) .+ (say|state|cover|include)\b/.test(text) ||
    /\b(according to|from) (my|the) .+(policy|contract|document|bill|statement|lease agreement)\b/.test(
      text,
    )
  ) {
    return true;
  }

  if (
    /\b(document|pdf|upload|contract|bill|policy) .+(say|state|show|mention)\b/.test(
      text,
    ) ||
    /\bwhat does my .+ (policy|contract|bill|document)\b/.test(text)
  ) {
    return true;
  }

  if (
    /\binsurance policy\b/.test(text) &&
    !/\b(payment|premium|how much|amount|cost|fee|pay)\b/.test(text)
  ) {
    return true;
  }

  if (
    /\b(coverage|insured for|liability limit|policy term)\b/.test(text) &&
    !/\b(can i afford|can we afford|what if)\b/.test(text)
  ) {
    return true;
  }

  return false;
}

/** Month totals, category payments, balances — use ledger paths, not document RAG first. */
export function isLedgerLookupQuestion(message: string): boolean {
  if (isSimpleMonthForecastQuery(message)) return true;
  if (LEDGER_PAYMENT_QUERY.test(message) && !isDocumentProseQuery(message)) {
    return true;
  }
  return false;
}

/** Prefer document RAG when chunks match or the question targets document prose. */
export function shouldPreferDocumentRag(
  message: string,
  topChunkScore: number,
): boolean {
  if (isDocumentProseQuery(message)) return true;
  if (isLedgerLookupQuestion(message)) return false;
  return topChunkScore >= 0.3;
}
