import Link from "next/link";

import { EngineModuleLayout } from "@/components/EngineModuleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ExplainEnginePage() {
  return (
    <EngineModuleLayout
      title="AI Explanation Layer"
      subtitle="Natural-language interpretation of engine outputs only. Does not compute cash flow or mutate canonical data."
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Primary experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use Scenario Chat for the full conversational UI with live timeline
            and risk panels.
          </p>
          <Button render={<Link href="/scenario" />} nativeButton={false}>
            Open scenario chat
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API entry points</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <code className="block rounded-md border border-border px-3 py-2 text-xs">
            POST /api/explain
          </code>
          <code className="block rounded-md border border-border px-3 py-2 text-xs">
            POST /api/scenario-chat
          </code>
        </CardContent>
      </Card>
    </EngineModuleLayout>
  );
}
