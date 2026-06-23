import type { DocumentMimeType } from "@/types/documents";

const ALLOWED_MIME_TYPES: DocumentMimeType[] = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/tiff",
];

const EXTENSION_TO_MIME: Record<string, DocumentMimeType> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  tif: "image/tiff",
  tiff: "image/tiff",
};

export function isAllowedDocumentMimeType(
  mimeType: string,
): mimeType is DocumentMimeType {
  return ALLOWED_MIME_TYPES.includes(mimeType as DocumentMimeType);
}

/** Browsers on Windows often leave `file.type` empty — infer from extension. */
export function resolveDocumentMimeType(
  mimeType: string,
  filename: string,
): DocumentMimeType | null {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized && normalized !== "application/octet-stream") {
    if (isAllowedDocumentMimeType(normalized)) return normalized;
  }

  const ext = getExtensionFromFilename(filename);
  const fromExt = EXTENSION_TO_MIME[ext];
  return fromExt ?? null;
}

export function getExtensionFromFilename(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? (parts.pop()?.toLowerCase() ?? "") : "";
}

export function bytesToMegabytes(bytes: number): number {
  return bytes / (1024 * 1024);
}
