"use client";

import {
  Calendar,
  Landmark,
  LineChart,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface ParsedLine {
  text: string;
  indent: number;
}

interface ParsedSubsection {
  title: string;
  lines: ParsedLine[];
}

interface ParsedSection {
  title: string;
  subsections: ParsedSubsection[];
}

const SECTION_STYLES: Record<
  string,
  { icon: typeof Landmark; accent: string; ring: string; gradient: string }
> = {
  "investment analyst": {
    icon: Landmark,
    accent: "text-teal-700 dark:text-teal-300",
    ring: "ring-teal-500/20",
    gradient: "from-teal-500/15 via-emerald-500/10 to-transparent",
  },
  "cost analyst": {
    icon: LineChart,
    accent: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-500/20",
    gradient: "from-amber-500/15 via-orange-500/5 to-transparent",
  },
  "payment planner": {
    icon: Calendar,
    accent: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-500/20",
    gradient: "from-violet-500/15 via-purple-500/5 to-transparent",
  },
};

function parseLines(block: string): ParsedLine[] {
  return block
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
      return { text: line.trim(), indent };
    });
}

export function parseSpecialistSections(text: string): ParsedSection[] | null {
  if (!text.includes("### ")) return null;

  const sections: ParsedSection[] = [];
  const parts = text.split(/\n(?=### )/);

  for (const part of parts) {
    const match = part.match(/^### (.+?)(?:\n|$)/);
    if (!match) continue;

    const title = match[1].trim();
    const body = part.slice(match[0].length);
    const subsections: ParsedSubsection[] = [];
    const subParts = body.split(/\n(?=#### )/);

    for (const subPart of subParts) {
      const subMatch = subPart.match(/^#### (.+?)(?:\n|$)/);
      if (subMatch) {
        subsections.push({
          title: subMatch[1].trim(),
          lines: parseLines(subPart.slice(subMatch[0].length)),
        });
      } else if (subPart.trim()) {
        subsections.push({ title: "", lines: parseLines(subPart) });
      }
    }

    if (subsections.length > 0) {
      sections.push({ title, subsections });
    }
  }

  return sections.length > 0 ? sections : null;
}

function splitAccountLine(
  text: string,
): { name: string; amount: string; currency?: string } | null {
  const match = text.match(/^- (.+?): (\$[\d,]+\.\d{2})(?:\s+(\w{3}))?$/);
  if (!match) return null;
  return { name: match[1], amount: match[2], currency: match[3] };
}

function splitSnapshotLine(
  text: string,
): { name: string; amount: string; delta?: string } | null {
  const match = text.match(/^• (.+?): (\$[\d,]+\.\d{2})(?: \((.+)\))?$/);
  if (!match) return null;
  return { name: match[1], amount: match[2], delta: match[3] };
}

function splitPctMetric(
  text: string,
): { label: string; value: string } | null {
  const match = text.match(/^- (.+?):\s*(\+?-?[\d.]+%)$/);
  if (!match) return null;
  return { label: match[1], value: match[2] };
}

function splitMonthProjection(
  text: string,
): { month: string; balance: string; net: string } | null {
  const match = text.match(
    /^• (\d{4}-\d{2}): (\$[\d,]+\.\d{2}) CAD \((\+?-?\$[\d,]+\.\d{2}) net\)$/,
  );
  if (!match) return null;
  return { month: match[1], balance: match[2], net: match[3] };
}

function DeltaBadge({ delta }: { delta: string }) {
  const positive = delta.includes("+") && !delta.startsWith("+0");
  const negative = delta.includes("-") && !delta.includes("+-");
  const neutral = !positive && !negative;

  return (
    <Badge
      variant="outline"
      className={
        neutral
          ? "border-muted-foreground/30 text-muted-foreground"
          : positive
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      }
    >
      {delta}
    </Badge>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  const positive = value.startsWith("+") && value !== "+0.00%";
  const negative = value.startsWith("-");

  return (
    <div className="rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/30 p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${
          positive
            ? "text-emerald-600 dark:text-emerald-400"
            : negative
              ? "text-amber-600 dark:text-amber-400"
              : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ForecastSubsection({ subsection }: { subsection: ParsedSubsection }) {
  const metrics = subsection.lines
    .map((l) => splitPctMetric(l.text))
    .filter((m): m is NonNullable<typeof m> => m !== null);
  const projections = subsection.lines
    .map((l) => splitMonthProjection(l.text))
    .filter((p): p is NonNullable<typeof p> => p !== null);
  const starting = subsection.lines.find((l) =>
    l.text.toLowerCase().includes("starting cash"),
  );

  return (
    <div className="space-y-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Wallet className="size-4 text-teal-600 dark:text-teal-400" />
        {subsection.title}
      </h4>

      {starting ? (
        <div className="rounded-lg border border-teal-500/25 bg-teal-500/5 px-4 py-3 text-sm">
          {starting.text.replace(/^- /, "")}
        </div>
      ) : null}

      {projections.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Projected month-end cash
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {projections.map((row) => {
              const up = row.net.startsWith("+") && !row.net.startsWith("+$0");
              return (
                <div
                  key={row.month}
                  className="rounded-xl border border-border/50 bg-card/80 p-3 shadow-sm transition hover:border-teal-500/30"
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {row.month}
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {row.balance}
                  </p>
                  <p
                    className={`mt-0.5 text-xs font-medium tabular-nums ${
                      up
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {row.net} net
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {metrics.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {metrics.map((m) => (
            <MetricCard key={m.label} label={m.label} value={m.value} />
          ))}
        </div>
      ) : null}

      <GenericLines
        lines={subsection.lines.filter((l) => {
          if (splitPctMetric(l.text)) return false;
          if (splitMonthProjection(l.text)) return false;
          if (l.text.toLowerCase().includes("starting cash")) return false;
          if (l.text.toLowerCase().includes("projected month-end")) return false;
          return true;
        })}
      />
    </div>
  );
}

function GenericLines({ lines }: { lines: ParsedLine[] }) {
  if (lines.length === 0) return null;

  return (
    <ul className="space-y-2 text-sm">
      {lines.map((line, index) => {
        const isTrend =
          line.text.toLowerCase().includes("trend:") ||
          line.text.toLowerCase().includes("total growth");
        const isPositive =
          line.text.includes("+") && !line.text.includes("+$0.00");
        const isNegative =
          line.text.includes("-$") ||
          (line.text.includes("net -") && !line.text.includes("net -$0"));

        return (
          <li
            key={`${index}-${line.text}`}
            className={line.indent > 0 ? "ml-3" : undefined}
          >
            {isTrend ? (
              <span className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                {isPositive ? (
                  <TrendingUp className="size-4 shrink-0 text-emerald-600" />
                ) : isNegative ? (
                  <TrendingDown className="size-4 shrink-0 text-amber-600" />
                ) : (
                  <LineChart className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span>{line.text.replace(/^- /, "").replace(/^• /, "")}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">
                {line.text.replace(/^- /, "• ").replace(/^• /, "• ")}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function SubsectionBlock({ subsection }: { subsection: ParsedSubsection }) {
  const isForecast = subsection.title
    .toLowerCase()
    .includes("forecast cash");

  if (isForecast) {
    return <ForecastSubsection subsection={subsection} />;
  }

  const accountRows = subsection.lines
    .map((line) => splitAccountLine(line.text))
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const isAccountTable =
    subsection.title.toLowerCase().includes("linked accounts") &&
    accountRows.length > 0;

  const isHistory =
    subsection.title.toLowerCase().includes("plaid balance history") ||
    subsection.title.toLowerCase().includes("balance history");

  if (isAccountTable) {
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">
          {subsection.title}
        </h4>
        <div className="overflow-hidden rounded-xl border border-border/50 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-muted/80 to-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Account</th>
                <th className="px-4 py-2.5 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card/50">
              {accountRows.map((row) => (
                <tr key={row.name} className="transition hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {row.amount}
                    {row.currency ? (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        {row.currency}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {subsection.title ? (
        <h4 className="text-sm font-semibold text-foreground">
          {subsection.title}
        </h4>
      ) : null}
      <ul className="space-y-2 text-sm">
        {subsection.lines.map((line, index) => {
          if (line.text.startsWith("- ") && line.text.endsWith(":")) {
            const date = line.text.slice(2, -1);
            return (
              <li
                key={`${index}-${line.text}`}
                className="mt-4 list-none rounded-md bg-muted/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {date}
              </li>
            );
          }

          const snapshot = isHistory ? splitSnapshotLine(line.text) : null;
          if (snapshot) {
            return (
              <li
                key={`${index}-${line.text}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 bg-card/60 px-3 py-2.5"
              >
                <span className="font-medium">{snapshot.name}</span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">
                    {snapshot.amount}
                  </span>
                  {snapshot.delta ? (
                    <DeltaBadge delta={snapshot.delta} />
                  ) : null}
                </span>
              </li>
            );
          }

          return (
            <li key={`${index}-${line.text}`} className="text-muted-foreground">
              {line.text.replace(/^- /, "").replace(/^• /, "→ ")}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SectionCard({ section }: { section: ParsedSection }) {
  const style =
    SECTION_STYLES[section.title.toLowerCase()] ?? SECTION_STYLES["cost analyst"];
  const Icon = style.icon;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-border/50 bg-card/70 shadow-lg ring-1 ${style.ring}`}
    >
      <div
        className={`border-b border-border/40 bg-gradient-to-r px-5 py-4 ${style.gradient}`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex size-10 items-center justify-center rounded-xl bg-background/80 shadow-sm ${style.accent}`}
          >
            <Icon className="size-5" />
          </span>
          <h3 className="text-base font-semibold tracking-tight">
            {section.title}
          </h3>
        </div>
      </div>
      <div className="space-y-6 p-5">
        {section.subsections.map((subsection) => (
          <SubsectionBlock
            key={subsection.title || subsection.lines[0]?.text}
            subsection={subsection}
          />
        ))}
      </div>
    </div>
  );
}

export function ChatResponseBody({ text }: { text: string }) {
  const sections = parseSpecialistSections(text);

  if (!sections) {
    return (
      <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
          {text}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <SectionCard key={section.title} section={section} />
      ))}
    </div>
  );
}

/** Highlight percentage values inside summary prose. */
export function HighlightedSummary({ text }: { text: string }) {
  const parts = text.split(/(\+?-?[\d.]+%|\$[\d,]+\.\d{2})/g);

  return (
    <p className="text-[15px] leading-relaxed text-foreground/90">
      {parts.map((part, i) => {
        if (/^\+?-?[\d.]+%$/.test(part) || /^\$[\d,]+\.\d{2}$/.test(part)) {
          return (
            <span
              key={i}
              className="font-semibold text-emerald-700 dark:text-emerald-300"
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}
