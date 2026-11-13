import { EngineModuleLayout } from "@/components/EngineModuleLayout";
import { ApiKeysPanel } from "@/components/auth/ApiKeysPanel";
import { RecoveryCodePanel } from "@/components/auth/RecoveryCodePanel";

export const dynamic = "force-dynamic";

export default function ApiKeysPage() {
  return (
    <EngineModuleLayout
      title="Account & API keys"
      subtitle="Connect an AI agent to your own data, and manage your password recovery code."
    >
      <ApiKeysPanel />
      <RecoveryCodePanel />
    </EngineModuleLayout>
  );
}
