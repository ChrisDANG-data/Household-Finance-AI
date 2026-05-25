import { jsonSuccess } from "@/utils/api-response";
import { withApiHandler } from "@/lib/api/route-handler";
import { documentRepository } from "@/services/document-intelligence/document.repository";
import { AppError } from "@/utils/errors";

export const runtime = "nodejs";

interface ExtractionBody {
  documentId: string;
}

/** POST — re-run text extraction for a stored document */
export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = (await request.json()) as ExtractionBody;
    if (!body?.documentId) {
      throw new AppError("documentId is required", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    const document = await documentRepository.runExtraction(body.documentId);
    return jsonSuccess({ document });
  });
}
