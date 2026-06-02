import { put } from "@vercel/blob";

import { env } from "@/lib/env";
import { AppError } from "@/utils/errors";
import { getExtensionFromFilename } from "@/utils/file";

import { sanitizeDocumentFilename } from "./local-document-storage";

function blobToken(): string {
  const token = env.upload.blobReadWriteToken();
  if (!token) {
    throw new AppError("BLOB_READ_WRITE_TOKEN is not configured", {
      code: "STORAGE_NOT_CONFIGURED",
      statusCode: 503,
    });
  }
  return token;
}

function objectKey(documentId: string, filename: string): string {
  const safeName = sanitizeDocumentFilename(filename);
  const ext = getExtensionFromFilename(filename);
  const base = ext ? safeName : safeName;
  return `documents/${documentId}/${base}`;
}

export async function saveDocumentFileToBlob(
  documentId: string,
  filename: string,
  bytes: Buffer,
  contentType?: string,
): Promise<string> {
  const blob = await put(objectKey(documentId, filename), bytes, {
    access: "private",
    token: blobToken(),
    contentType: contentType ?? "application/octet-stream",
    addRandomSuffix: false,
  });
  return blob.url;
}

export async function readDocumentFileFromBlob(storagePath: string): Promise<Buffer> {
  const response = await fetch(storagePath, {
    headers: {
      Authorization: `Bearer ${blobToken()}`,
    },
  });

  if (!response.ok) {
    throw new AppError(`Failed to read blob (${response.status})`, {
      code: "STORAGE_ERROR",
      statusCode: 502,
    });
  }

  return Buffer.from(await response.arrayBuffer());
}
