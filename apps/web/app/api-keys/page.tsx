import { EngineModuleLayout } from "@/components/EngineModuleLayout";
import { ApiKeysPanel } from "@/components/auth/ApiKeysPanel";

export const dynamic = "force-dynamic";

export default function ApiKeysPage() {
  return (
    <EngineModuleLayout
      title="API keys"
      subtitle="Connect an AI agent to your own household data."
    >
      <ApiKeysPanel />
    </EngineModuleLayout>
  );
}
