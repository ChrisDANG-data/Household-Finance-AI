import { describe, expect, it } from "vitest";

import {
  MAX_FINANCIAL_AMOUNT,
  MIN_FINANCIAL_AMOUNT,
  validateFinancialAmount,
} from "@/services/financial-state/amount-validation";
import { AppError } from "@/utils/errors";

describe("validateFinancialAmount", () => {
  it("accepts normal amounts", () => {
    expect(validateFinancialAmount(5200)).toBe(5200);
    expect(validateFinancialAmount(99.999)).toBe(100);
  });

  it("rejects negative amounts", () => {
    expect(() => validateFinancialAmount(-1)).toThrow(AppError);
    expect(() => validateFinancialAmount(-1)).toThrow(/cannot be negative/);
  });

  it("rejects zero by default", () => {
    expect(() => validateFinancialAmount(0)).toThrow(/at least/);
  });

  it("allows zero when configured", () => {
    expect(validateFinancialAmount(0, { allowZero: true })).toBe(0);
  });

  it("rejects amounts above max", () => {
    expect(() => validateFinancialAmount(MAX_FINANCIAL_AMOUNT + 1)).toThrow(
      /exceeds maximum/,
    );
  });

  it("rejects non-finite values", () => {
    expect(() => validateFinancialAmount(Number.NaN)).toThrow(/valid number/);
    expect(() => validateFinancialAmount(Number.POSITIVE_INFINITY)).toThrow(
      /valid number/,
    );
  });

  it("enforces minimum", () => {
    expect(validateFinancialAmount(MIN_FINANCIAL_AMOUNT)).toBe(MIN_FINANCIAL_AMOUNT);
    expect(() => validateFinancialAmount(0.001)).toThrow(/at least/);
  });
});
