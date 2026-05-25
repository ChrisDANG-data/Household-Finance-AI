import type { NarrationRequest } from "@/types/explanation";
import { AppError } from "@/utils/errors";

/**
 * AI Explanation Layer — TTS narration of pre-computed explanations (no math).
 */
export class NarrationService {
  async synthesize(_request: NarrationRequest): Promise<ArrayBuffer> {
    throw new AppError("Narration synthesis not implemented", {
      code: "NOT_IMPLEMENTED",
      statusCode: 501,
    });
  }
}

export const narrationService = new NarrationService();
