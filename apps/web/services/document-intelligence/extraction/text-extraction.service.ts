import { readFile } from "node:fs/promises";

import { createWorker } from "tesseract.js";

import { resolveStoragePath } from "@/lib/storage/local-document-storage";
import type { DocumentMimeType } from "@/types/documents";
import { AppError } from "@/utils/errors";

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(buffer);
  return (result.text ?? "").trim();
}

async function extractImageText(buffer: Buffer): Promise<string> {
  const worker = await createWorker("eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return text.trim();
  } finally {
    await worker.terminate();
  }
}

/**
 * Deterministic text extraction from stored documents (PDF / images).
 */
export class TextExtractionService {
  async extractFromStorage(
    storagePath: string,
    mimeType: DocumentMimeType,
  ): Promise<string> {
    const resolved = resolveStoragePath(storagePath);
    const buffer = await readFile(resolved);

    if (mimeType === "application/pdf") {
      return extractPdfText(buffer);
    }

    if (
      mimeType === "image/png" ||
      mimeType === "image/jpeg" ||
      mimeType === "image/webp" ||
      mimeType === "image/tiff"
    ) {
      return extractImageText(buffer);
    }

    throw new AppError(`Unsupported mime type for extraction: ${mimeType}`, {
      code: "UNSUPPORTED_MIME_TYPE",
      statusCode: 400,
    });
  }
}

export const textExtractionService = new TextExtractionService();
