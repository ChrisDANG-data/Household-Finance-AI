import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface HomeFeatureCardProps {
  name: string;
  href: string;
  description: string;
  icon: LucideIcon;
  featured?: boolean;
}

export function HomeFeatureCard({
  name,
  href,
  description,
  icon: Icon,
  featured,
}: HomeFeatureCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex min-h-[190px] flex-col rounded-2xl bg-white p-6 shadow-[0_8px_40px_-12px_rgba(16,185,129,0.25)] transition-all duration-300",
        "hover:-translate-y-1.5 hover:shadow-[0_20px_50px_-12px_rgba(16,185,129,0.35)]",
        "dark:bg-emerald-950/40 dark:shadow-emerald-900/30",
        featured && "ring-2 ring-emerald-500/30",
      )}
    >
      <div className="mb-4 flex items-start justify-between">
        <span className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/35 transition-transform duration-300 group-hover:scale-110">
          <Icon className="size-6" />
        </span>
        <ArrowUpRight className="size-4 text-emerald-600/50 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:text-emerald-400/50 dark:group-hover:text-emerald-400" />
      </div>
      <h3 className="text-lg font-bold tracking-tight text-emerald-950 dark:text-emerald-50">
        {name}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-emerald-900/60 dark:text-emerald-100/70">
        {description}
      </p>
      {featured ? (
        <span className="mt-4 inline-flex w-fit rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          Ask AI
        </span>
      ) : null}
    </Link>
  );
}
