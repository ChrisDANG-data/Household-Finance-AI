import { prisma } from "@/lib/prisma";
import { DEFAULT_USER_ID } from "@/services/financial-state/financial-state.persistence";
import {
  MANUAL_ACCOUNT_TYPE_LABELS,
  normalizeSnapshotDate,
  type ManualAccountType,
} from "@/services/manual-accounts/manual-account.types";
import type {
  PlaidBalanceChartSeries,
  RecordedBalanceRow,
} from "@/services/integrations/plaid/plaid-balance-history.service";

function accountKey(
  bankName: string,
  accountName: string,
  accountType: string,
): string {
  return `${bankName}|${accountName}|${accountType}`;
}

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

function snapshotParts(snapshotDate: string): {
  snapshot_date: string;
  year: number;
  month: number;
} {
  const snapshot_date = normalizeSnapshotDate(snapshotDate);
  const [year, month] = snapshot_date.split("-").map(Number);
  return { snapshot_date, year, month };
}

export class ManualAccountHistoryService {
  async getChartSeries(
    userId: string = DEFAULT_USER_ID,
  ): Promise<PlaidBalanceChartSeries[]> {
    const rows = await prisma.manualAccountBalance.findMany({
      where: { userId },
      orderBy: [{ snapshotDate: "asc" }, { bankName: "asc" }, { accountName: "asc" }],
    });

    const byAccount = new Map<string, PlaidBalanceChartSeries>();
    const lastBalance = new Map<string, number>();

    for (const row of rows) {
      const key = accountKey(row.bankName, row.accountName, row.accountType);
      const { snapshot_date, year, month } = snapshotParts(row.snapshotDate);
      const balance = Number(row.balance);
      const prev = lastBalance.get(key);
      const balance_delta =
        prev == null ? null : Number((balance - prev).toFixed(2));
      lastBalance.set(key, balance);

      let series = byAccount.get(key);
      if (!series) {
        series = {
          plaid_account_id: key,
          account_name: accountDisplayName(
            row.bankName,
            row.accountName,
            row.accountType,
          ),
          points: [],
        };
        byAccount.set(key, series);
      }

      series.points.push({
        snapshot_date,
        year,
        month,
        balance,
        balance_delta,
      });
    }

    return [...byAccount.values()];
  }

  async listRecent(
    userId: string = DEFAULT_USER_ID,
    limit = 50,
  ): Promise<RecordedBalanceRow[]> {
    const rows = await prisma.manualAccountBalance.findMany({
      where: { userId },
      orderBy: [{ snapshotDate: "desc" }, { bankName: "asc" }, { accountName: "asc" }],
    });

    const chronological = [...rows].sort((a, b) => {
      const dateCmp = normalizeSnapshotDate(a.snapshotDate).localeCompare(
        normalizeSnapshotDate(b.snapshotDate),
      );
      if (dateCmp !== 0) return dateCmp;
      return accountKey(a.bankName, a.accountName, a.accountType).localeCompare(
        accountKey(b.bankName, b.accountName, b.accountType),
      );
    });

    const lastBalance = new Map<string, number>();
    const deltaByRowId = new Map<string, number | null>();

    for (const row of chronological) {
      const key = accountKey(row.bankName, row.accountName, row.accountType);
      const balance = Number(row.balance);
      const prev = lastBalance.get(key);
      deltaByRowId.set(
        row.id,
        prev == null ? null : Number((balance - prev).toFixed(2)),
      );
      lastBalance.set(key, balance);
    }

    return rows.slice(0, limit).map((row) => {
      const { snapshot_date, year, month } = snapshotParts(row.snapshotDate);
      return {
        id: row.id,
        plaid_account_id: accountKey(row.bankName, row.accountName, row.accountType),
        account_name: accountDisplayName(
          row.bankName,
          row.accountName,
          row.accountType,
        ),
        balance: Number(row.balance),
        currency: row.currency,
        year,
        month,
        snapshot_date,
        balance_delta: deltaByRowId.get(row.id) ?? null,
        sync_source: "manual",
      };
    });
  }
}

export const manualAccountHistoryService = new ManualAccountHistoryService();
