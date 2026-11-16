"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import { useEffect, useState } from "react";

/** Shown to accounts with no data, so a forecast of zeros is not mistaken for a real result. */
export function EmptyAccountNotice() {
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/account", { cache: "no-store", credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { success?: boolean; data?: { empty_account?: boolean } } | null) => {
        if (!cancelled && payload?.success) {
          setEmpty(payload.data?.empty_account === true);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!empty) return null;

  return (
    <div
      role="status"
      className="mb-6 flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
    >
      <Info className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" />
      <p>
        <strong>Your account has no data yet.</strong> The forecast and AI answers
        below will show zeros or “high risk” until you add some. Start with your
        income and regular expenses on the{" "}
        <Link href="/ledger" className="font-medium underline underline-offset-4">
          Ledger
        </Link>{" "}
        page and a starting balance on the{" "}
        <Link href="/balances" className="font-medium underline underline-offset-4">
          Balances
        </Link>{" "}
        page.
      </p>
    </div>
  );
}
