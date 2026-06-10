"use client";

import { useCallback, useEffect, useState } from "react";

import {
  LANGGRAPH_MODE_STORAGE_KEY,
  type LangGraphRoutingMode,
  readLangGraphMode,
} from "@/lib/langgraph-mode";

export function useLangGraphMode() {
  const [mode, setModeState] = useState<LangGraphRoutingMode>("hybrid");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setModeState(readLangGraphMode());
    setLoaded(true);
  }, []);

  const setMode = useCallback((next: LangGraphRoutingMode) => {
    setModeState(next);
    sessionStorage.setItem(LANGGRAPH_MODE_STORAGE_KEY, next);
  }, []);

  return {
    mode,
    setMode,
    loaded,
    langgraphEnabled: mode === "hybrid",
  };
}
