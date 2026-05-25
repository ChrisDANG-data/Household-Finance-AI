import type { EmbeddingRecord } from "@/types/documents";
import { AppError } from "@/utils/errors";

/**
 * Document Intelligence Engine — vector indexing for retrieval (not LLM explanation).
 */
export class DocumentEmbeddingService {
  async embedText(_text: string): Promise<number[]> {
    throw new AppError("Embedding generation not implemented", {
      code: "NOT_IMPLEMENTED",
      statusCode: 501,
    });
  }

  async embedDocumentChunks(
    _documentId: string,
    _chunks: string[],
  ): Promise<EmbeddingRecord[]> {
    throw new AppError("Document chunk embedding not implemented", {
      code: "NOT_IMPLEMENTED",
      statusCode: 501,
    });
  }
}

export const documentEmbeddingService = new DocumentEmbeddingService();
