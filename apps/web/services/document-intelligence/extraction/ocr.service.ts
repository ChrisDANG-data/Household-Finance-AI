import { AppError } from "@/utils/errors";

/**
 * Document Intelligence Engine — OCR (deterministic / provider APIs, not LLM reasoning).
 */
export class OcrService {
  async extractText(_storageKey: string, _mimeType: string): Promise<string> {
    throw new AppError("OCR extraction not implemented", {
      code: "NOT_IMPLEMENTED",
      statusCode: 501,
    });
  }
}

export const ocrService = new OcrService();
