import type { Prisma } from "@prisma/client";

/** Prisma row type — avoid importing `Document` (conflicts with DOM lib). */
export type DbDocument = Prisma.DocumentGetPayload<Record<string, never>>;

export type DbFinancialObligation =
  Prisma.FinancialObligationGetPayload<Record<string, never>>;
