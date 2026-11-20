"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { AiProvider, AiProviderConfig } from "@/lib/ai-provider";

const DEFAULT_CONFIG: AiProviderConfig = {
  claude: false,
  stt_cloud: false,
  stt_local: false,
  default: "claude",
};

interface AiProviderContextValue {
  /** Always Claude — kept so callers can pass it through as `ai_provider`. */
  provider: AiProvider;
  config: AiProviderConfig;
  loaded: boolean;
  claudeAvailable: boolean;
  cloudSttAvailable: boolean;
  localSttAvailable: boolean;
}

const AiProviderContext = createContext<AiProviderContextValue | null>(null);

export function AiProviderProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AiProviderConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/ai/config", { cache: "no-store" })
      .then((res) => res.json() as Promise<{ success: boolean; data?: AiProviderConfig }>)
      .then((json) => {
        if (!cancelled && json.success && json.data) setConfig(json.data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      provider: "claude" as const,
      config,
      loaded,
      claudeAvailable: config.claude,
      cloudSttAvailable: config.stt_cloud,
      localSttAvailable: config.stt_local,
    }),
    [config, loaded],
  );

  return (
    <AiProviderContext.Provider value={value}>
      {children}
    </AiProviderContext.Provider>
  );
}

export function useAiProvider(): AiProviderContextValue {
  const ctx = useContext(AiProviderContext);
  if (!ctx) {
    throw new Error("useAiProvider must be used within AiProviderProvider");
  }
  return ctx;
}
