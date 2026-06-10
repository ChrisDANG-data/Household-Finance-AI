import { currentUtcMonth } from "@/services/financial-state/dates";
import { simulateForecast } from "@/services/financial-state/projection";
import type { FinancialState } from "@/services/financial-state/state.types";

function formatCad(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function isForecastTrendQuestion(message: string): boolean {
  const text = message.trim().toLowerCase();

  if (/\bmonth[- ]over[- ]month\b/.test(text) || /\bmom\b/.test(text)) {
    return true;
  }

  if (
    /\b(average|avg)\b/.test(text) &&
    /\b(increase|growth|change)\b/.test(text)
  ) {
    return true;
  }

  if (
    /%|percent|percentage/.test(text) &&
    /\b(increase|growth|trend)\b/.test(text)
  ) {
    return true;
  }

  if (
    /%/.test(text) &&
    /\b(next|following|over)\s+\d+\s*months?/.test(text)
  ) {
    return true;
  }

  return false;
}

function parseHorizonMonths(message: string, defaultMonths = 3): number {
  const text = message.toLowerCase();
  const patterns = [
    /(?:following|next|over)\s+(\d+)\s*months?/,
    /(\d+)\s*months?/,
    /(\d+)-month/,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const months = Number.parseInt(match[1] ?? "", 10);
      if (months >= 1 && months <= 12) return months;
    }
  }

  return defaultMonths;
}

export function tryForecastTrendAnswer(
  message: string,
  state: FinancialState,
  months: number,
  startMonth?: string,
): string | null {
  if (!isForecastTrendQuestion(message)) return null;

  const horizon = parseHorizonMonths(message, 3);
  const start = startMonth ?? currentUtcMonth();
  const timeline = simulateForecast(state, Math.max(months, horizon), start);

  if (timeline.length === 0) {
    return "No forecast timeline available from your ledger.";
  }

  const currentCash = state.current_cash;
  const monthClosings: Array<{ month: string; closing: number }> = [];
  let running = currentCash;

  for (const row of timeline.slice(0, horizon)) {
    let closing = row.closing_balance;
    if (closing == null) {
      running += row.net_cash_flow;
      closing = running;
    } else {
      running = closing;
    }
    monthClosings.push({ month: row.month, closing });
  }

  const lines: string[] = [
    "### Forecast cash (household ledger)",
    `- Starting cash today: ${formatCad(currentCash)} CAD`,
    "- Projected month-end cash:",
  ];

  for (const { month, closing } of monthClosings) {
    const row = timeline.find((t) => t.month === month);
    const net = row?.net_cash_flow ?? 0;
    const sign = net >= 0 ? "+" : "";
    lines.push(
      `  • ${month}: ${formatCad(closing)} CAD (${sign}${formatCad(net)} net)`,
    );
  }

  const momPcts: number[] = [];
  lines.push("- Month-over-month balance change:");
  let previous = currentCash;

  for (const { month, closing } of monthClosings) {
    if (previous !== 0) {
      const pct = ((closing - previous) / Math.abs(previous)) * 100;
      momPcts.push(pct);
      lines.push(
        `  • ${month}: ${formatPct(pct)} (${formatCad(previous)} → ${formatCad(closing)})`,
      );
    }
    previous = closing;
  }

  if (momPcts.length > 0) {
    const average = momPcts.reduce((sum, value) => sum + value, 0) / momPcts.length;
    const lastClosing =
      monthClosings[monthClosings.length - 1]?.closing ?? currentCash;
    const totalPct =
      currentCash !== 0
        ? ((lastClosing - currentCash) / Math.abs(currentCash)) * 100
        : 0;

    lines.push(
      `- Average month-over-month increase (${momPcts.length} months): ${formatPct(average)}`,
    );
    lines.push(
      `- Total growth over ${monthClosings.length} months: ${formatPct(totalPct)}`,
    );
  }

  return lines.join("\n");
}
