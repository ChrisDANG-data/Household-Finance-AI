"use client";

import { cn } from "@/lib/utils";
import type { LangGraphRoutingMode } from "@/lib/langgraph-mode";

interface LangGraphModeSwitchProps {
  mode: LangGraphRoutingMode;
  onModeChange: (mode: LangGraphRoutingMode) => void;
  className?: string;
  loaded?: boolean;
}

export function LangGraphModeSwitch({
  mode,
  onModeChange,
  className,
  loaded = true,
}: LangGraphModeSwitchProps) {
  if (!loaded) {
    return (
      <div
        className={cn("h-8 w-44 animate-pulse rounded-lg bg-muted/60", className)}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-border/80 bg-muted/40 p-0.5",
        className,
      )}
      role="group"
      aria-label="Routing mode"
    >
      <ModeButton
        label="Hybrid"
        title="LangGraph multi-agent for complex questions"
        active={mode === "hybrid"}
        onClick={() => onModeChange("hybrid")}
      />
      <ModeButton
        label="Direct"
        title="Skip LangGraph — deterministic ledger and forecast advisor only"
        active={mode === "direct"}
        onClick={() => onModeChange("direct")}
      />
    </div>
  );
}

function ModeButton({
  label,
  title,
  active,
  onClick,
}: {
  label: string;
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
