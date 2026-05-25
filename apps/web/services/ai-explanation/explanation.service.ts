import type { ExplanationRequest, ExplanationResponse } from "@/types/explanation";
import { AppError } from "@/utils/errors";

/**
 * AI Explanation Layer — LLM-only reasoning over read-only snapshots.
 *
 * Rules:
 * - Never performs financial calculations (use Forecast Simulation Engine).
 * - Never writes canonical data (use Financial State Engine).
 * - Never stores vectors or files (use Document Intelligence Engine).
 */
export class ExplanationService {
  async explain(_request: ExplanationRequest): Promise<ExplanationResponse> {
    throw new AppError("Explanation generation not implemented", {
      code: "NOT_IMPLEMENTED",
      statusCode: 501,
    });
  }
}

export const explanationService = new ExplanationService();
