import { prisma } from "@/lib/prisma";
import {
  currentUtcMonth,
  formatLocalDateIso,
} from "@/services/financial-state/dates";
import {
  DEFAULT_USER_ID,
  financialStatePersistence,
} from "@/services/financial-state/financial-state.persistence";
import { AppError } from "@/utils/errors";

import {
  aggregateManualAccounts,
  isValidManualAccountType,
  isValidSnapshotDate,
  normalizeSnapshotDate,
  snapshotDateToLedgerMonth,
  type ManualAccountInput,
  type ManualAccountRecord,
  type SaveManualSnapshotInput,
} from "./manual-account.types";

function mapRow(row: {
  id: string;
  userId: string;
  snapshotDate: string;
  bankName: string;
  accountName: string;
  accountType: string;
  balance: { toString(): string };
  currency: string;
  holdingsNotes: string | null;
}): ManualAccountRecord {
  return {
    id: row.id,
    user_id: row.userId,
    snapshot_date: normalizeSnapshotDate(row.snapshotDate),
    bank_name: row.bankName,
    account_name: row.accountName,
    account_type: row.accountType as ManualAccountRecord["account_type"],
    balance: Number(row.balance),
    currency: row.currency,
    holdings_notes: row.holdingsNotes,
  };
}

function sortSnapshotDatesDesc(dates: string[]): string[] {
  return [...new Set(dates.map(normalizeSnapshotDate))].sort((a, b) =>
    b.localeCompare(a),
  );
}

function validateAccountInput(account: ManualAccountInput, index: number): void {
  if (!account.bank_name?.trim()) {
    throw new AppError(`accounts[${index}].bank_name is required`, {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }
  if (!isValidManualAccountType(account.account_type)) {
    throw new AppError(`accounts[${index}].account_type is invalid`, {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }
  if (!Number.isFinite(account.balance) || account.balance < 0) {
    throw new AppError(`accounts[${index}].balance must be >= 0`, {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }
}

function snapshotDateQueryValues(snapshotDate: string): string[] {
  const normalized = normalizeSnapshotDate(snapshotDate);
  const legacyMonth = normalized.slice(0, 7);
  return normalized === legacyMonth ? [legacyMonth] : [normalized, legacyMonth];
}

export class ManualAccountService {
  async listForDate(
    userId: string = DEFAULT_USER_ID,
    snapshotDate?: string,
  ): Promise<{ snapshot_date: string; accounts: ManualAccountRecord[] }> {
    const normalized =
      snapshotDate != null
        ? normalizeSnapshotDate(snapshotDate)
        : await this.resolveActiveSnapshotDate(userId);
    const rows = await prisma.manualAccountBalance.findMany({
      where: {
        userId,
        snapshotDate: { in: snapshotDateQueryValues(normalized) },
      },
      orderBy: [{ bankName: "asc" }, { accountName: "asc" }],
    });
    const storedDate = rows[0]?.snapshotDate ?? normalized;
    return {
      snapshot_date: normalizeSnapshotDate(storedDate),
      accounts: rows.map(mapRow),
    };
  }

  async listSnapshotDates(userId: string = DEFAULT_USER_ID): Promise<string[]> {
    const rows = await prisma.manualAccountBalance.findMany({
      where: { userId },
      distinct: ["snapshotDate"],
      select: { snapshotDate: true },
    });
    return sortSnapshotDatesDesc(rows.map((r) => r.snapshotDate));
  }

  /** Latest snapshot date with rows, else today (local). */
  async resolveActiveSnapshotDate(
    userId: string = DEFAULT_USER_ID,
  ): Promise<string> {
    const dates = await this.listSnapshotDates(userId);
    return dates[0] ?? formatLocalDateIso(new Date());
  }

  /** Latest snapshot on or before the ledger month, else latest overall. */
  async resolveSnapshotForLedgerMonth(
    userId: string = DEFAULT_USER_ID,
    ledgerMonth: string = currentUtcMonth(),
  ): Promise<string> {
    const dates = await this.listSnapshotDates(userId);
    if (dates.length === 0) return formatLocalDateIso(new Date());

    const inMonth = dates.filter(
      (d) => snapshotDateToLedgerMonth(d) === ledgerMonth,
    );
    if (inMonth.length > 0) return inMonth[0];

    return dates[0];
  }

  async saveSnapshot(
    userId: string = DEFAULT_USER_ID,
    input: SaveManualSnapshotInput,
  ): Promise<{ snapshot_date: string; accounts: ManualAccountRecord[] }> {
    const snapshotDate = normalizeSnapshotDate(input.snapshot_date);
    if (!isValidSnapshotDate(snapshotDate)) {
      throw new AppError("snapshot_date must be YYYY-MM-DD", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    input.accounts.forEach(validateAccountInput);

    await prisma.$transaction(async (tx) => {
      await tx.manualAccountBalance.deleteMany({
        where: {
          userId,
          snapshotDate: { in: snapshotDateQueryValues(snapshotDate) },
        },
      });

      if (input.accounts.length > 0) {
        await tx.manualAccountBalance.createMany({
          data: input.accounts.map((account) => ({
            userId,
            snapshotDate,
            bankName: account.bank_name.trim(),
            accountName: (account.account_name ?? "").trim(),
            accountType: account.account_type,
            balance: account.balance,
            currency: account.currency?.trim() || "CAD",
            holdingsNotes: account.holdings_notes?.trim() || null,
          })),
        });
      }
    });

    const saved = await this.listForDate(userId, snapshotDate);
    const latestDate = await this.resolveActiveSnapshotDate(userId);

    if (snapshotDate === latestDate) {
      const aggregated = aggregateManualAccounts(saved.accounts);
      await financialStatePersistence.upsertStateScalars({
        user_id: userId,
        balance_source: "manual",
        current_cash: aggregated.checking,
        manual_checking: aggregated.checking,
        manual_savings: aggregated.savings,
        manual_cash_management: aggregated.cash_management,
        manual_investment: aggregated.investment,
        manual_credit_owed: aggregated.credit_owed,
      });
    }

    return saved;
  }

  async deleteAccount(
    userId: string = DEFAULT_USER_ID,
    accountId: string,
  ): Promise<void> {
    const row = await prisma.manualAccountBalance.findFirst({
      where: { id: accountId, userId },
    });
    if (!row) {
      throw new AppError("Manual account not found", {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }
    await prisma.manualAccountBalance.delete({ where: { id: accountId } });
  }

  async getAggregatedForLedgerMonth(
    userId: string = DEFAULT_USER_ID,
    ledgerMonth?: string,
  ) {
    const month = ledgerMonth ?? currentUtcMonth();
    const snapshot_date = await this.resolveSnapshotForLedgerMonth(
      userId,
      month,
    );
    const { accounts } = await this.listForDate(userId, snapshot_date);

    return {
      snapshot_date,
      ledger_month: month,
      accounts,
      aggregated: aggregateManualAccounts(accounts),
    };
  }
}

export const manualAccountService = new ManualAccountService();
