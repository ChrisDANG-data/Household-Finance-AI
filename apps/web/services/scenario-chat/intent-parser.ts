import {
  addMonths,
  currentUtcMonth,
  parseMonth,
} from "@/services/financial-state/dates";

import type {
  ParsedScenarioMessage,
  ScenarioIntent,
  ScenarioParameters,
} from "./types";

const MONTH_NAMES: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

function normalizeMessage(message: string): string {
  return message.trim().toLowerCase();
}

export function classifyIntent(message: string): ScenarioIntent {
  const text = normalizeMessage(message);

  if (
    /\b(can i afford|could i afford|afford a|afford to|afford an)\b/.test(text) ||
    /\bdo i have enough\b/.test(text)
  ) {
    return "affordability_check";
  }

  if (
    /\bwhat if\b/.test(text) ||
    /\bwhat happens if\b/.test(text) ||
    /\bwhat would happen\b/.test(text) ||
    /\bsuppose i\b/.test(text) ||
    /\bif i (buy|get|purchase|take|start|invest|increase)\b/.test(text)
  ) {
    return "what_if_simulation";
  }

  if (
    /\b(can i|could i|should i)\b/.test(text) &&
    /\b(invest|investment|increase|contribute|contribution)\b/.test(text)
  ) {
    return "what_if_simulation";
  }

  if (
    /\bwhy\b/.test(text) &&
    /\b(cash flow|cashflow|negative|deficit|short|bad|stress|low)\b/.test(text)
  ) {
    return "explanation_request";
  }

  return "general_finance_question";
}

function extractAmount(text: string): number | undefined {
  const cadMatch =
    /\$?\s*([\d,]+(?:\.\d{1,2})?)\s*\$?\s*(?:cad|dollars?)?/i.exec(text);
  if (cadMatch) {
    const value = Number(cadMatch[1].replace(/,/g, ""));
    if (Number.isFinite(value) && value > 0) return value;
  }

  const kMatch = /\$?\s*([\d.]+)\s*k\b/i.exec(text);
  if (kMatch) {
    return Number(kMatch[1]) * 1000;
  }

  return undefined;
}

function extractPercentChange(text: string): number | undefined {
  const drop = /(?:drop|decrease|reduce|cut|less)\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*%/.exec(
    text,
  );
  if (drop) return -Number(drop[1]);

  const rise = /(?:increase|rise|grow|more)\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*%/.exec(
    text,
  );
  if (rise) return Number(rise[1]);

  const bare = /(\d+(?:\.\d+)?)\s*%\s*(?:drop|decrease|less|cut)/.exec(text);
  if (bare) return -Number(bare[1]);

  const bareUp = /(\d+(?:\.\d+)?)\s*%\s*(?:increase|more|rise)/.exec(text);
  if (bareUp) return Number(bareUp[1]);

  const incomeDrop = /income\s+(?:drops?|falls?|decreases?)\s+(?:by\s+)?(\d+)/.exec(
    text,
  );
  if (incomeDrop) return -Number(incomeDrop[1]);

  return undefined;
}

function extractTargetMonth(text: string, referenceYear?: number): string | undefined {
  const year = referenceYear ?? parseMonth(currentUtcMonth()).year;

  const isoMonth = /(\d{4})-(\d{2})/.exec(text);
  if (isoMonth) {
    return `${isoMonth[1]}-${isoMonth[2]}`;
  }

  for (const [name, monthNum] of Object.entries(MONTH_NAMES)) {
    if (new RegExp(`\\b${name}\\b`, "i").test(text)) {
      return `${year}-${String(monthNum).padStart(2, "0")}`;
    }
  }

  if (/\bnext month\b/.test(text)) {
    return currentUtcMonth(); // orchestrator can addMonths(+1) if needed
  }

  return undefined;
}

function extractEventType(text: string): string | undefined {
  const keywords: Record<string, string> = {
    vacation: "vacation",
    holiday: "vacation",
    trip: "vacation",
    car: "car_purchase",
    vehicle: "car_purchase",
    house: "housing",
    home: "housing",
    rent: "rent",
    renovation: "renovation",
  };

  for (const [key, category] of Object.entries(keywords)) {
    if (new RegExp(`\\b${key}\\b`, "i").test(text)) {
      return category;
    }
  }

  if (/\bbuy\b/.test(text) || /\bpurchase\b/.test(text)) {
    return "purchase";
  }

  return undefined;
}

function isInvestmentScenario(text: string): boolean {
  return /\b(invest|investment|tfsa|resp|rrsp|contribution)\b/i.test(text);
}

function extractModification(
  text: string,
  intent: ScenarioIntent,
): ScenarioParameters["modification"] {
  if (
    isInvestmentScenario(text) &&
    /\b(increase|add|extra|more|contribute|put)\b/i.test(text)
  ) {
    return "add_one_time_investment";
  }

  if (intent === "affordability_check") {
    if (/\/\s*month\b|\bper\s+month\b|\bmonthly\b/i.test(text)) {
      return "add_recurring_expense";
    }
    return "add_one_time_expense";
  }

  if (/\bincome\b/.test(text) && /\b(drop|decrease|less|cut|falls?)\b/.test(text)) {
    return "decrease_income";
  }
  if (/\bincome\b/.test(text) && /\b(increase|more|rise|grows?)\b/.test(text)) {
    return "increase_income";
  }

  if (/\b(expense|spending|costs?)\b/.test(text) && /\b(increase|more|higher)\b/.test(text)) {
    return "increase_expense";
  }
  if (/\b(expense|spending|costs?)\b/.test(text) && /\b(decrease|less|lower|cut)\b/.test(text)) {
    return "decrease_expense";
  }

  if (/\bbuy\b/.test(text) || /\bpurchase\b/.test(text) || /\bpay\b/.test(text)) {
    return "add_one_time_expense";
  }

  return undefined;
}

export function parseScenarioMessage(message: string): ParsedScenarioMessage {
  const intent = classifyIntent(message);
  const text = normalizeMessage(message);
  const referenceYear = parseMonth(currentUtcMonth()).year;

  const parameters: ScenarioParameters = {
    amount: extractAmount(text),
    target_month: extractTargetMonth(text, referenceYear),
    event_type: extractEventType(text),
    modification: extractModification(text, intent),
    percent_change: extractPercentChange(text),
    description: message.trim(),
  };

  if (intent === "affordability_check" && !parameters.modification) {
    parameters.modification = "add_one_time_expense";
  }

  if (/\bnext month\b/.test(text)) {
    parameters.target_month = addMonths(currentUtcMonth(), 1);
  }

  return {
    intent,
    parameters,
    raw_message: message.trim(),
  };
}
