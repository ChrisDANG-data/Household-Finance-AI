import { describe, expect, it } from "vitest";

import {
  MANUAL_ACCOUNT_TYPE_LABELS,
  normalizeSnapshotDate,
  type ManualAccountType,
} from "../manual-account.types";

function accountDisplayName(
  bankName: string,
  accountName: string,
  accountType: string,
): string {
  const typeLabel =
    MANUAL_ACCOUNT_TYPE_LABELS[accountType as ManualAccountType] ?? accountType;
  const labelParts = [bankName, accountName].filter(Boolean);
  return labelParts.length > 0
    ? `${labelParts.join(" · ")} (${typeLabel})`
    : typeLabel;
}

function snapshotParts(snapshotDate: string) {
  const snapshot_date = normalizeSnapshotDate(snapshotDate);
  const [year, month] = snapshot_date.split("-").map(Number);
  return { snapshot_date, year, month };
}

describe("manual account history helpers", () => {
  it("normalizes legacy month snapshots for chart dates", () => {
    expect(snapshotParts("2026-06")).toEqual({
      snapshot_date: "2026-06-01",
      year: 2026,
      month: 6,
    });
    expect(snapshotParts("2026-06-15")).toEqual({
      snapshot_date: "2026-06-15",
      year: 2026,
      month: 6,
    });
  });

  it("builds stable account display names", () => {
    expect(accountDisplayName("RBC", "Joint chequing", "checking")).toBe(
      "RBC · Joint chequing (Checking)",
    );
  });
});
