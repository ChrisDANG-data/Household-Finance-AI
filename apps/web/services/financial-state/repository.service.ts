import { prisma } from "@/lib/prisma";

/**
 * Financial State Engine — Prisma access and infrastructure health.
 */
export class FinancialStateRepository {
  get client() {
    return prisma;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

export const financialStateRepository = new FinancialStateRepository();
