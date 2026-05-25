import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EngineModuleLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function EngineModuleLayout({
  title,
  subtitle,
  children,
}: EngineModuleLayoutProps) {
  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col gap-8 px-6 py-12">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2"
          render={<Link href="/" />}
          nativeButton={false}
        >
          <ArrowLeft className="size-4" />
          System overview
        </Button>
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Engine module
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-muted-foreground">{subtitle}</p>
      </div>
      {children}
      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        <Button render={<Link href="/scenario" />} nativeButton={false}>
          Open scenario chat
        </Button>
        <Button
          variant="outline"
          render={<Link href="/" />}
          nativeButton={false}
        >
          Four-engine overview
        </Button>
      </div>
    </main>
  );
}
