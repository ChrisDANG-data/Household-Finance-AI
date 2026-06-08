/** Specialist selection for LangGraph hybrid routing. */
export type AnalystMode = "auto" | "cost" | "investment" | "payments";

export type OrchestratorRoute =
  | "deterministic_ledger"
  | "langgraph"
  | "ledger_llm"
  | "advisor";

/**
 * Complex questions that benefit from multi-specialist LangGraph orchestration.
 */
export function isComplexMultiAgentQuery(message: string): boolean {
  const text = message.trim().toLowerCase();

  if (
    /\b(can i afford|could i afford|afford to|afford a|afford an|afford another|do i have enough)\b/.test(
      text,
    )
  ) {
    return true;
  }

  if (
    /\bwhat if\b/.test(text) ||
    /\bwhat happens if\b/.test(text) ||
    /\bwhat would happen\b/.test(text) ||
    /\bsuppose i\b/.test(text)
  ) {
    return true;
  }

  if (/\bshould i (pay|invest|buy|take|keep|reduce)\b/.test(text)) {
    return true;
  }

  if (/\b(pay off|payoff|pay down|tradeoff|trade-off)\b/.test(text)) {
    return true;
  }

  if (/\b( vs | versus )\b/.test(text)) {
    return true;
  }

  if (
    /\b(can i|could i|should i)\b/.test(text) &&
    /\b(invest|investment|increase|contribute|contribution|tfsa|resp|rrsp)\b/.test(
      text,
    )
  ) {
    return true;
  }

  if (
    /\bincrease my (investment|contributions?|tfsa|resp|rrsp)\b/.test(text) ||
    /\badd\b.*\b(investment|tfsa|resp|rrsp)\b/.test(text)
  ) {
    return true;
  }

  // Linked-account balance / trend questions — investment specialist via LangGraph
  if (
    /\b(balance|balances|checking|savings|plaid|account)\b/.test(text) &&
    /\b(trend|trends|history|over time|changing|movement|going up|going down)\b/.test(
      text,
    )
  ) {
    return true;
  }

  if (/\bwhat('s| is) my (balance|checking|savings)\b/.test(text)) {
    return true;
  }

  return false;
}

/** User picked a single specialist — route through LangGraph for that profile. */
export function isForcedAnalystMode(
  analystMode?: AnalystMode,
): analystMode is Exclude<AnalystMode, "auto"> {
  return (
    analystMode === "cost" ||
    analystMode === "investment" ||
    analystMode === "payments"
  );
}

export function shouldUseLangGraph(
  message: string,
  analystMode?: AnalystMode,
): boolean {
  if (isForcedAnalystMode(analystMode)) return true;
  return isComplexMultiAgentQuery(message);
}
