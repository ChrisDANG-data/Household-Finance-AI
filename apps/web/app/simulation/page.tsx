import { EngineModuleLayout } from "@/components/EngineModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ENDPOINTS = [
  { method: "POST", path: "/api/simulation/forecast", label: "Cash-flow forecast" },
  { method: "POST", path: "/api/simulation/scenarios", label: "What-if scenario" },
];

export default function SimulationEnginePage() {
  return (
    <EngineModuleLayout
      title="Forecast Simulation Engine"
      subtitle="Deterministic cash-flow and scenario math over canonical financial state. No LLM calls."
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API entry points</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ENDPOINTS.map((ep) => (
            <div
              key={ep.path}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
            >
              <span>{ep.label}</span>
              <code className="text-xs text-muted-foreground">
                {ep.method} {ep.path}
              </code>
            </div>
          ))}
        </CardContent>
      </Card>
    </EngineModuleLayout>
  );
}
