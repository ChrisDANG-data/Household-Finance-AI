import { AppError } from "@/utils/errors";

/**
 * AI Explanation Layer — validates LLM JSON against versioned schemas.
 * Rejects malformed or schema-violating output before any downstream use.
 */
export class StructuredOutputService {
  validate<T>(
    _raw: string,
    _schemaId: string,
    _schemaVersion: string,
  ): T {
    throw new AppError("Structured output validation not implemented", {
      code: "NOT_IMPLEMENTED",
      statusCode: 501,
    });
  }
}

export const structuredOutputService = new StructuredOutputService();
