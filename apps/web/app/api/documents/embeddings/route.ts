import { withAuthenticatedHandler } from "@/lib/api/authenticated-handler";
import { documentRepository } from "@/services/document-intelligence/document.repository";
import { documentEmbeddingService } from "@/services/document-intelligence/indexing/embedding.service";
import { jsonSuccess } from "@/utils/api-response";
import { AppError } from "@/utils/errors";

export const runtime = "nodejs";

/** POST — Index one of the signed-in user's documents into vector chunks for RAG */
export async function POST(request: Request) {
  return withAuthenticatedHandler(async (userId) => {
    const body = await request.json();
    const { documentId } = body;

    if (!documentId || typeof documentId !== "string") {
      throw new AppError('Missing required field: "documentId"', {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    // Ownership check — 404s when the document belongs to another user.
    await documentRepository.getById(documentId, userId);

    const records = await documentEmbeddingService.indexDocument(documentId);

    return jsonSuccess({
      documentId,
      chunksIndexed: records.length,
      records: records.map(({ id, chunkIndex, metadata }) => ({
        id,
        chunkIndex,
        metadata,
      })),
    });
  });
}
