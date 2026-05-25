import type { DocumentUploadPayload, DocumentUploadResult } from "@/types/documents";
import { AppError } from "@/utils/errors";
import { isAllowedDocumentMimeType } from "@/utils/file";

/**
 * Document Intelligence Engine — intake (PDF/images).
 * Storage and metadata persistence go through Financial State Engine repositories.
 */
export class DocumentUploadService {
  async upload(_payload: DocumentUploadPayload): Promise<DocumentUploadResult> {
    throw new AppError("Document upload not implemented", {
      code: "NOT_IMPLEMENTED",
      statusCode: 501,
    });
  }

  validateMimeType(mimeType: string): void {
    if (!isAllowedDocumentMimeType(mimeType)) {
      throw new AppError(`Unsupported file type: ${mimeType}`, {
        code: "UNSUPPORTED_MIME_TYPE",
        statusCode: 400,
      });
    }
  }
}

export const documentUploadService = new DocumentUploadService();
