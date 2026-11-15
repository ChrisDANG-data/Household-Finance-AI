import { prisma } from "@/lib/prisma";

export const EMPTY_ACCOUNT_MESSAGE =
  "Your account has no data yet, so there is nothing to answer from. " +
  "Add your income, regular expenses, and a starting cash balance first " +
  "(Ledger and Balances pages, or ask your agent to add ledger entries), then ask again.";

/**
 * True when the account has nothing a question could be answered from:
 * no ledger entries, no cash balance, no manual balances, and no documents.
 */
export async function isAccountEmpty(userId: string): Promise<boolean> {
  const [events, documents, balances, state] = await Promise.all([
    prisma.financialEvent.count({ where: { userId } }),
    prisma.document.count({ where: { userId } }),
    prisma.manualAccountBalance.count({ where: { userId } }),
    prisma.financialState.findUnique({
      where: { userId },
      select: { currentCash: true },
    }),
  ]);

  return (
    events === 0 &&
    documents === 0 &&
    balances === 0 &&
    Number(state?.currentCash ?? 0) === 0
  );
}
