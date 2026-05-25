import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scenario Chat — Household Financial Intelligence",
  description: "Conversational financial advisor with live simulation",
};

export default function ChatLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-col bg-background">{children}</div>
  );
}
