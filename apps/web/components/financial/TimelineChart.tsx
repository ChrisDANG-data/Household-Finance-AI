"use client";

import type { SerializedTimelineMonth } from "@/lib/serialize-scenario-response";
import { cn } from "@/lib/utils";

interface TimelineChartProps {
  timeline: SerializedTimelineMonth[];
  stressMonths?: string[];
  className?: string;
}

function formatCad(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function TimelineChart({
  timeline,
  stressMonths = [],
  className,
}: TimelineChartProps) {
  if (timeline.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No forecast data yet.</p>
    );
  }

  const maxAbs = Math.max(
    ...timeline.map((m) => Math.abs(m.net_cash_flow)),
    1,
  );
  const stressSet = new Set(stressMonths);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex h-44 items-end gap-1.5 border-b border-border pb-1">
        {timeline.map((month) => {
          const negative = month.net_cash_flow < 0;
          const stressed =
            stressSet.has(month.month) || negative;
          const heightPct = Math.max(
            8,
            (Math.abs(month.net_cash_flow) / maxAbs) * 100,
          );

          return (
            <div
              key={month.month}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
              title={`${month.month}: ${formatCad(month.net_cash_flow)}`}
            >
              <div
                className={cn(
                  "w-full max-w-8 rounded-t-sm transition-colors",
                  stressed
                    ? "bg-red-500/80 dark:bg-red-500/70"
                    : "bg-emerald-500/80 dark:bg-emerald-500/70",
                )}
                style={{ height: `${heightPct}%` }}
              />
              <span className="text-[10px] text-muted-foreground">
                {month.month.slice(5)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-sm bg-emerald-500/80" />
          Positive / safe
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-sm bg-red-500/80" />
          Stress / negative
        </span>
      </div>
    </div>
  );
}
