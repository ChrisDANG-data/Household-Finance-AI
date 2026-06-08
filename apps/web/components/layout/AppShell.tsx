"use client";

import { AiProviderProvider } from "@/components/ai/AiProviderContext";
import { FloatingNav } from "@/components/layout/FloatingNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AiProviderProvider>
      <div className="fi-app-bg relative flex min-h-full flex-col">
        <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 sm:pt-5">
          <FloatingNav />
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </AiProviderProvider>
  );
}
