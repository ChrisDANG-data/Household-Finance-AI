import type { FinancialEvent, FinancialEventFrequency } from "./types";

const RECURRING_FREQUENCIES: FinancialEventFrequency[] = [
  "monthly",
  "weekly",
  "quarterly",
  "yearly",
];

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function exactDedupeKey(event: FinancialEvent): string {
  return [
    event.type,
    event.category,
    event.amount,
    event.frequency,
    event.owner,
    formatDate(event.start_date),
    event.end_date ? formatDate(event.end_date) : "",
  ].join("|");
}

export function recurringStreamKey(event: FinancialEvent): string {
  return [
    event.type,
    event.category,
    event.owner,
    event.amount,
    event.frequency,
  ].join("|");
}

function isRecurringFrequency(frequency: FinancialEventFrequency): boolean {
  return RECURRING_FREQUENCIES.includes(frequency);
}

/** Same row already in the ledger (all fields match). */
export function findExactDuplicate(
  candidate: FinancialEvent,
  existing: FinancialEvent[],
  excludeId?: string,
): FinancialEvent | undefined {
  const key = exactDedupeKey(candidate);
  return existing.find(
    (event) => event.id !== excludeId && exactDedupeKey(event) === key,
  );
}

/** Recurring stream with same type/category/owner/amount/frequency (different start_date). */
export function findRecurringStreamDuplicate(
  candidate: FinancialEvent,
  existing: FinancialEvent[],
  excludeId?: string,
): FinancialEvent | undefined {
  if (!isRecurringFrequency(candidate.frequency)) {
    return undefined;
  }
  const key = recurringStreamKey(candidate);
  return existing.find(
    (event) =>
      event.id !== excludeId &&
      isRecurringFrequency(event.frequency) &&
      recurringStreamKey(event) === key,
  );
}

/** Remove identical events (e.g. duplicate rows from re-ingest). */
export function dedupeExactFinancialEvents(
  events: FinancialEvent[],
): FinancialEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = exactDedupeKey(event);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * For recurring streams re-recorded with a new start_date, keep the latest row only.
 * One-time events are unchanged (after exact dedupe).
 */
export function dedupeFinancialEventsForProjection(
  events: FinancialEvent[],
): FinancialEvent[] {
  const exact = dedupeExactFinancialEvents(events);
  const other: FinancialEvent[] = [];
  const recurring: FinancialEvent[] = [];

  for (const event of exact) {
    if (RECURRING_FREQUENCIES.includes(event.frequency)) {
      recurring.push(event);
    } else {
      other.push(event);
    }
  }

  const streamWinners = new Map<string, FinancialEvent>();
  for (const event of recurring) {
    const key = recurringStreamKey(event);
    const prev = streamWinners.get(key);
    if (!prev || event.start_date.getTime() > prev.start_date.getTime()) {
      streamWinners.set(key, event);
    }
  }

  return [...other, ...streamWinners.values()].sort(
    (a, b) => a.start_date.getTime() - b.start_date.getTime(),
  );
}
