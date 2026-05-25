import { AppError } from "@/utils/errors";

export interface ExtractedDocumentPayload {
  documentId: string;
  rawText: string;
  /** Validated structured payload — must conform to schema before Financial State ingest */
  structuredData?: Record<string, unknown>;
}

/**
 * Document Intelligence Engine — text → structured obligations/events (pre-canonical).
 * May use constrained parsing; output is validated JSON, never written to canonical state directly.
 */
export class DocumentExtractionService {
  async extract(_documentId: string): Promise<ExtractedDocumentPayload> {
    throw new AppError("Document extraction not implemented", {
      code: "NOT_IMPLEMENTED",
      statusCode: 501,
    });
  }
}

export const documentExtractionService = new DocumentExtractionService();
