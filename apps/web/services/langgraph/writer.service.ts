import { llmComplete } from "@/services/ai/llm/llm.service";
import type { AiProvider } from "@/services/ai/llm/types";

const WRITER_SYSTEM = `You are a household financial narrator. Write a short summary (2–4 complete sentences) of the specialist report below.

RULES (strict):
- Do NOT change, round, invent, or recompute any dollar amounts or percentages — quote them exactly as written.
- If the report includes computed metrics (e.g. average month-over-month increase), state them in the first sentence.
- Do NOT contradict an affordability verdict if one appears in the report.
- When both forecast ledger cash and Plaid balances appear, explain they measure different things (projected vs linked accounts).
- Lead with the direct answer to the user's question, then one supporting fact.
- No markdown headers, bullets, or section titles — plain prose only.
- Always finish with a complete sentence ending in a period.
- If data is missing in the report, say it is unavailable; do not guess.`;

export function extractDeterministicSummary(
  detailAnswer: string,
  message: string,
): string | null {
  const detail = detailAnswer.trim();
  if (!detail) return null;

  const avgMom = detail.match(
    /Average month-over-month increase \((\d+) months\):\s*(\+?-?[\d.]+%)/i,
  );
  const totalGrowth = detail.match(
    /Total growth over (\d+) months:\s*(\+?-?[\d.]+%)/i,
  );
  const trend = detail.match(
    /Trend:\s*(\$[\d,]+\.\d{2})\s*→\s*(\$[\d,]+\.\d{2})\s*over (\d+) months/i,
  );

  if (avgMom) {
    const months = avgMom[1];
    const pct = avgMom[2];
    const parts = [
      `Your average month-over-month balance increase for the next ${months} months is ${pct}, based on your household ledger forecast.`,
    ];
    if (totalGrowth) {
      parts.push(`Total projected growth over that period is ${totalGrowth[2]}.`);
    }
    if (trend) {
      parts.push(
        `Projected cash moves from ${trend[1]} to ${trend[2]} CAD over ${trend[3]} months.`,
      );
    }
    return parts.join(" ");
  }

  const verdict = detail.match(/\*\*Verdict:\*\*\s*(.+)/i);
  if (verdict && /afford/i.test(message)) {
    const proposed = detail.match(
      /Proposed \*\*additional\*\* payment:\s*(\$[\d,]+\.\d{2})\/month/i,
    );
    const buffer = detail.match(
      /Estimated buffer after[^:]*:\s*about\s*(\$[\d,]+\.\d{2})/i,
    );
    const parts = [verdict[1].trim()];
    if (proposed) parts.push(`Proposed payment: ${proposed[1]}/month.`);
    if (buffer) parts.push(`Estimated buffer afterward: about ${buffer[1]} CAD.`);
    return parts.join(" ");
  }

  const starting = detail.match(/Starting cash today:\s*(\$[\d,]+\.\d{2})/i);
  if (starting && /balance|trend/i.test(message) && trend) {
    return `Your forecast cash starts at ${starting[1]} CAD and is projected to reach ${trend[2]} CAD over ${trend[3]} months.`;
  }

  return null;
}

export function looksTruncatedSummary(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 50) return true;
  if (!/[.!?]$/.test(trimmed)) return true;
  if (
    /average month-over-month|for the next$/i.test(trimmed) &&
    !/%/.test(trimmed)
  ) {
    return true;
  }
  return false;
}

export async function narrateSpecialistReport(input: {
  message: string;
  detailAnswer: string;
  ai_provider?: AiProvider;
}): Promise<string | null> {
  const detail = input.detailAnswer.trim();
  if (!detail) return null;

  const deterministic = extractDeterministicSummary(detail, input.message);

  try {
    const { text } = await llmComplete({
      provider: input.ai_provider,
      maxTokens: 512,
      temperature: 0.2,
      caller: "langgraph-writer",
      system: WRITER_SYSTEM,
      user: `User question: ${input.message}\n\nSpecialist report (source of truth — do not alter numbers):\n${detail}`,
    });
    const llmSummary = text.trim();
    if (llmSummary.length > 0 && !looksTruncatedSummary(llmSummary)) {
      return llmSummary;
    }
  } catch {
    // fall through to deterministic summary
  }

  return deterministic;
}
