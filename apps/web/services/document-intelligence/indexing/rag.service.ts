import type { DocumentRagQuery, DocumentRagResult } from "@/types/documents";
import { AppError } from "@/utils/errors";

/**
 * Document Intelligence Engine — semantic retrieval over document chunks.
 */
export class DocumentRagService {
  async retrieve(_query: DocumentRagQuery): Promise<DocumentRagResult> {
    throw new AppError("Document RAG retrieval not implemented", {
      code: "NOT_IMPLEMENTED",
      statusCode: 501,
    });
  }

  async indexDocument(_documentId: string): Promise<void> {
    throw new AppError("Document RAG indexing not implemented", {
      code: "NOT_IMPLEMENTED",
      statusCode: 501,
    });
  }
}

export const documentRagService = new DocumentRagService();
