import type { DocumentMimeType } from "@/types/documents";

const ALLOWED_MIME_TYPES: DocumentMimeType[] = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/tiff",
];

export function isAllowedDocumentMimeType(
  mimeType: string,
): mimeType is DocumentMimeType {
  return ALLOWED_MIME_TYPES.includes(mimeType as DocumentMimeType);
}

export function getExtensionFromFilename(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? (parts.pop()?.toLowerCase() ?? "") : "";
}

export function bytesToMegabytes(bytes: number): number {
  return bytes / (1024 * 1024);
}
