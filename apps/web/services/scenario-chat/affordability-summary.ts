import type { FinancialRiskReport } from "@/services/financial-state/risk";
import type { FinancialState } from "@/services/financial-state/state.types";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Parse $500/month, 500$/month, etc. */
export function parseMonthlyAmount(message: string): number | null {
  const patterns = [
    /\$?\s*([\d,]+(?:\.\d{1,2})?)\s*\$\s*\/\s*month/i,
    /\$?\s*([\d,]+(?:\.\d{1,2})?)\s*\/\s*month/i,
    /\$?\s*([\d,]+(?:\.\d{1,2})?)\s*per\s+month/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const value = Number(match[1].replace(/,/g, ""));
      if (Number.isFinite(value) && value > 0) return value;
    }
  }
  return null;
}

function carLeaseLines(state: FinancialState): string[] {
  return state.events
    .filter((e) => {
      const cat = e.category.toLowerCase().replace(/-/g, "_");
      return cat.includes("lease") || cat === "car_lease" || cat === "car-lease";
    })
    .map(
      (e) =>
        `- ${e.category}: ${formatMoney(e.amount)} (${e.frequency})`,
    );
}

export function buildAffordabilitySummary(
  message: string,
  state: FinancialState,
  risk: FinancialRiskReport,
): string | null {
  if (!/\bafford\b/i.test(message)) return null;

  const proposed = parseMonthlyAmount(message);
  if (proposed == null) return null;

  const worst = risk.metrics.worst_month_cash_flow;
  const remaining = worst - proposed;
  const verdict =
    remaining > 500
      ? "Yes - likely affordable on the simulated forecast."
      : remaining > 0
        ? "Caution - tight after the added payment."
        : "No - would push worst-month cash flow negative.";

  const lines = [
    "### Affordability summary",
    `- Proposed additional payment: ${formatMoney(proposed)}/month`,
  ];

  const leases = carLeaseLines(state);
  if (leases.length > 0) {
    lines.push(
      "- Existing car/lease in your ledger (already in forecast):",
      ...leases,
      `- Combined if both apply: existing lease(s) + ${formatMoney(proposed)}/month`,
    );
  }

  lines.push(
    `- Worst-month net cash flow (current forecast): ${formatMoney(worst)} CAD`,
    `- Estimated buffer after +${formatMoney(proposed)}/month: about ${formatMoney(remaining)} CAD`,
    `- Verdict: ${verdict}`,
  );

  return lines.join("\n");
}

const SPECIALIST_SECTION =
  /\n### (Cost analyst|Payment planner|Investment analyst)\b/;

/** Keep only the affordability block when specialists would duplicate it. */
export function trimToAffordabilitySummary(answer: string): string {
  if (!answer.includes("### Affordability summary")) return answer;
  const idx = answer.indexOf("### Affordability summary");
  const block = answer.slice(idx);
  const specialistIdx = block.search(SPECIALIST_SECTION);
  if (specialistIdx === -1) return block.trim();
  return block.slice(0, specialistIdx).trim();
}

export function ensureAffordabilitySummary(
  message: string,
  state: FinancialState,
  risk: FinancialRiskReport,
  answer: string,
): string {
  const trimmed = trimToAffordabilitySummary(answer);
  if (trimmed.includes("### Affordability summary")) return trimmed;
  const summary = buildAffordabilitySummary(message, state, risk);
  if (!summary) return answer;
  return summary;
}
