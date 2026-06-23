import Anthropic from "@anthropic-ai/sdk";
import { createWorker } from "tesseract.js";

import { readDocumentFile } from "@/lib/storage/document-storage";
import { env } from "@/lib/env";
import { DEFAULT_ANTHROPIC_MODEL } from "@/services/ai/advisor/claude-client";
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
  } catch (error) {
    console.warn(
      "[extractImageText] OCR failed:",
      error instanceof Error ? error.message : error,
    );
    return "";
  } finally {
    await worker.terminate();
  }
}

/**
 * Use Claude Vision to extract text from an image — much better than Tesseract for scans.
 */
async function extractWithClaudeVision(
  imageBuffer: Buffer,
  mediaType: "image/png" | "image/jpeg" | "image/webp",
): Promise<string> {
  const apiKey = env.ai.anthropicApiKey();
  if (!apiKey) {
    return "";
  }

  const anthropic = new Anthropic({ apiKey });
  const base64 = imageBuffer.toString("base64");

  try {
    const message = await anthropic.messages.create({
      model: DEFAULT_ANTHROPIC_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: "Extract ALL text from this document image exactly as it appears. Preserve the layout, numbers, dates, and dollar amounts. Return only the extracted text, nothing else.",
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    return textBlock?.text?.trim() ?? "";
  } catch (error) {
    console.warn(
      "[extractWithClaudeVision] Claude vision failed, falling back to OCR:",
      error instanceof Error ? error.message : error,
    );
    return "";
  }
}

/**
 * For scanned/image-only PDFs: render each page and use Claude Vision to read it.
 */
async function extractScannedPdfText(buffer: Buffer): Promise<string> {
  const mupdf = await import("mupdf");
  const doc = mupdf.Document.openDocument(buffer, "application/pdf");
  const pageCount = doc.countPages();
  const pages: string[] = [];

  for (let i = 0; i < pageCount; i++) {
    const page = doc.loadPage(i);
    const pixmap = page.toPixmap(
      mupdf.Matrix.identity,
      mupdf.ColorSpace.DeviceRGB,
      false,
      true,
    );
    const pngBuffer = Buffer.from(pixmap.asPNG());

    const pageText = await extractWithClaudeVision(pngBuffer, "image/png");
    if (pageText) pages.push(pageText);
  }

  return pages.join("\n\n---\n\n").trim();
}

/**
 * Deterministic text extraction from stored documents (PDF / images).
 * Uses pdf-parse for text PDFs, Claude Vision for scanned PDFs and images.
 */
export class TextExtractionService {
  async extractFromStorage(
    storagePath: string,
    mimeType: DocumentMimeType,
  ): Promise<string> {
    const buffer = await readDocumentFile(storagePath);

    if (mimeType === "application/pdf") {
      const text = await extractPdfText(buffer);
      if (text.length > 0) return text;

      return extractScannedPdfText(buffer);
    }

    if (
      mimeType === "image/png" ||
      mimeType === "image/jpeg" ||
      mimeType === "image/webp"
    ) {
      const visionText = await extractWithClaudeVision(buffer, mimeType);
      if (visionText) return visionText;

      return extractImageText(buffer);
    }

    if (mimeType === "image/tiff") {
      return extractImageText(buffer);
    }

    throw new AppError(`Unsupported mime type for extraction: ${mimeType}`, {
      code: "UNSUPPORTED_MIME_TYPE",
      statusCode: 400,
    });
  }
}

export const textExtractionService = new TextExtractionService();
