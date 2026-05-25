import { EngineModuleLayout } from "@/components/EngineModuleLayout";
import { ObligationDashboard } from "@/components/ledger/ObligationDashboard";
import { DbSetupNotice } from "@/components/ui/DbSetupNotice";
import { currentUtcMonth } from "@/services/financial-state/dates";
import { obligationService } from "@/services/financial-state/obligation.service";

export const dynamic = "force-dynamic";

export default async function LedgerEnginePage() {
  const month = currentUtcMonth();
  let dbError: string | null = null;
  let obligations: Awaited<ReturnType<typeof obligationService.list>> = [];
  let summary: Awaited<ReturnType<typeof obligationService.getMonthlySummary>> =
    {
      month,
      total_monthly_obligations: 0,
      obligation_count: 0,
      active_obligation_ids: [],
    };

  try {
    [obligations, summary] = await Promise.all([
      obligationService.list(),
      obligationService.getMonthlySummary(month),
    ]);
  } catch (error) {
    dbError =
      error instanceof Error
        ? error.message
        : "Could not connect to the database.";
  }

  return (
    <EngineModuleLayout
      title="Financial obligations"
      subtitle="Create and edit obligations stored in PostgreSQL. Monthly totals use the deterministic projection engine."
    >
      {dbError ? (
        <DbSetupNotice message={dbError} />
      ) : (
        <ObligationDashboard
          initialObligations={obligations}
          initialSummary={summary}
          month={month}
        />
      )}
    </EngineModuleLayout>
  );
}
