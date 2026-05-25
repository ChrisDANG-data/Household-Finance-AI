import Link from "next/link";

import { EngineModuleCard } from "@/components/EngineModuleCard";
import { Button } from "@/components/ui/button";

const ENGINES = [
  {
    name: "Document Intelligence",
    href: "/documents",
    apiPath: "/api/documents/upload",
    description: "Upload, OCR, extraction, RAG indexing",
  },
  {
    name: "Financial State",
    href: "/ledger",
    apiPath: "/api/financial-state/ledger",
    description: "Canonical ledger & conversation storage",
  },
  {
    name: "Forecast Simulation",
    href: "/simulation",
    apiPath: "/api/simulation/forecast",
    description: "Deterministic forecasts & scenarios",
  },
  {
    name: "AI Explanation",
    href: "/explain",
    apiPath: "/api/explain",
    description: "LLM reasoning only — no math or storage",
  },
] as const;

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="max-w-2xl text-center">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Four-engine architecture
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Household Financial Intelligence
        </h1>
        <p className="mt-4 text-muted-foreground">
          Computation and canonical truth are separated from AI. LLMs explain
          pre-computed snapshots — they do not calculate or persist financial state.
        </p>
      </div>

      <ul className="grid w-full max-w-lg list-none gap-4 p-0 sm:grid-cols-2">
        {ENGINES.map((engine) => (
          <li key={engine.name}>
            <EngineModuleCard
              name={engine.name}
              href={engine.href}
              description={engine.description}
              apiPath={engine.apiPath}
            />
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button render={<Link href="/scenario" />} nativeButton={false}>
          Open scenario chat
        </Button>
        <Button
          variant="outline"
          render={<Link href="/api/health" />}
          nativeButton={false}
        >
          Health check
        </Button>
      </div>
    </main>
  );
}
