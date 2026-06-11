import { AppError } from "@/utils/errors";

/** Minimum amount for ledger events and obligations (CAD). */
export const MIN_FINANCIAL_AMOUNT = 0.01;

/** Hard ceiling — rejects writes above this (matches Decimal(12,2) practical limit). */
export const MAX_FINANCIAL_AMOUNT = 1_000_000;

/** Soft threshold for future UI warnings (not enforced on write). */
export const OUTLIER_FINANCIAL_AMOUNT = 50_000;

export interface AmountValidationOptions {
  /** When false (default), zero is rejected. */
  allowZero?: boolean;
  maxAmount?: number;
  field?: string;
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Validates a financial amount at API/write boundaries.
 * Throws AppError with VALIDATION_ERROR on failure.
 */
export function validateFinancialAmount(
  amount: number,
  options: AmountValidationOptions = {},
): number {
  const field = options.field ?? "amount";
  const maxAmount = options.maxAmount ?? MAX_FINANCIAL_AMOUNT;
  const allowZero = options.allowZero ?? false;

  if (!Number.isFinite(amount)) {
    throw new AppError(`${field} must be a valid number`, {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  if (amount < 0) {
    throw new AppError(`${field} cannot be negative`, {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  if (!allowZero && amount < MIN_FINANCIAL_AMOUNT) {
    throw new AppError(
      `${field} must be at least ${MIN_FINANCIAL_AMOUNT.toFixed(2)}`,
      {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      },
    );
  }

  if (amount > maxAmount) {
    throw new AppError(
      `${field} exceeds maximum allowed (${maxAmount.toLocaleString("en-CA")})`,
      {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      },
    );
  }

  return roundMoney(amount);
}
