import { EngineModuleLayout } from "@/components/EngineModuleLayout";
import { AccountBalancesPanel } from "@/components/integrations/AccountBalancesPanel";

export const dynamic = "force-dynamic";

export default function BalancesPage() {
  return (
    <EngineModuleLayout
      wide
      title="Account balances"
      subtitle="Track balances with manual entry or Plaid bank sync. Disposable assets and forecast opening cash use your chosen source."
    >
      <AccountBalancesPanel />
    </EngineModuleLayout>
  );
}
