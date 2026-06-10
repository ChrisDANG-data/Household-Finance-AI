export type LangGraphRoutingMode = "hybrid" | "direct";

export const LANGGRAPH_MODE_STORAGE_KEY = "fi-langgraph-mode";

export function langgraphModeToEnabled(mode: LangGraphRoutingMode): boolean {
  return mode === "hybrid";
}

export function readLangGraphMode(): LangGraphRoutingMode {
  if (typeof window === "undefined") return "hybrid";
  const stored = sessionStorage.getItem(LANGGRAPH_MODE_STORAGE_KEY);
  return stored === "direct" ? "direct" : "hybrid";
}
