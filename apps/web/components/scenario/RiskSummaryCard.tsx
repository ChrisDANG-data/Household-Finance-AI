"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FinancialRiskReport } from "@/services/financial-state/risk";
import type { CashFlowRiskLevel } from "@/services/financial-state/state.types";
import { cn } from "@/lib/utils";

interface RiskSummaryCardProps {
  riskLevel: CashFlowRiskLevel;
  risk?: FinancialRiskReport;
  stressMonthCount?: number;
}

const RISK_STYLES: Record<
  CashFlowRiskLevel,
  { badge: string; label: string }
> = {
  low: {
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    label: "Stable",
  },
  medium: {
    badge: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
    label: "Moderate",
  },
  high: {
    badge: "bg-red-500/15 text-red-700 dark:text-red-400",
    label: "Elevated",
  },
};

export function RiskSummaryCard({
  riskLevel,
  risk,
  stressMonthCount,
}: RiskSummaryCardProps) {
  const style = RISK_STYLES[riskLevel];
  const stressCount = stressMonthCount ?? risk?.stress_months.length ?? 0;
  const warnings = risk?.warning_events.length ?? 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Risk summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge className={cn("capitalize", style.badge)}>{riskLevel}</Badge>
          <span className="text-sm text-muted-foreground">{style.label}</span>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Stress months</dt>
            <dd className="font-medium tabular-nums">{stressCount}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Warnings</dt>
            <dd className="font-medium tabular-nums">{warnings}</dd>
          </div>
          {risk?.metrics && (
            <>
              <div>
                <dt className="text-muted-foreground">Avg savings</dt>
                <dd className="font-medium tabular-nums">
                  {risk.metrics.average_monthly_savings.toLocaleString("en-CA", {
                    style: "currency",
                    currency: "CAD",
                    maximumFractionDigits: 0,
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Worst month</dt>
                <dd className="font-medium tabular-nums">
                  {risk.metrics.worst_month_cash_flow.toLocaleString("en-CA", {
                    style: "currency",
                    currency: "CAD",
                    maximumFractionDigits: 0,
                  })}
                </dd>
              </div>
            </>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
