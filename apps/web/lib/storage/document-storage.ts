import { env } from "@/lib/env";
import { AppError } from "@/utils/errors";

import {
  isRemoteStoragePath,
  readDocumentFileFromLocal,
  saveDocumentFileToLocal,
} from "./local-document-storage";
import {
  readDocumentFileFromBlob,
  saveDocumentFileToBlob,
} from "./vercel-blob-document-storage";

export type DocumentStorageProvider = "local" | "blob";

function activeProvider(): DocumentStorageProvider {
  const configured = env.upload.storageProviderExplicit();
  if (configured === "blob") return "blob";
  if (configured === "local") return "local";

  // Vercel serverless has no writable project disk — use Blob when token exists
  if (process.env.VERCEL === "1") {
    if (env.upload.blobReadWriteToken()) return "blob";
    throw new AppError(
      "Document upload on Vercel requires a Blob store: set STORAGE_PROVIDER=blob and BLOB_READ_WRITE_TOKEN in project env, then redeploy.",
      { code: "STORAGE_NOT_CONFIGURED", statusCode: 503 },
    );
  }

  return "local";
}

function assertBlobConfigured(): void {
  if (!env.upload.blobReadWriteToken()) {
    throw new AppError(
      "STORAGE_PROVIDER=blob requires BLOB_READ_WRITE_TOKEN",
      { code: "STORAGE_NOT_CONFIGURED", statusCode: 503 },
    );
  }
}

/** Persist uploaded document bytes; returns storagePath (local path or blob URL). */
export async function saveDocumentFile(
  documentId: string,
  filename: string,
  bytes: Buffer,
  contentType?: string,
): Promise<string> {
  if (activeProvider() === "blob") {
    assertBlobConfigured();
    return saveDocumentFileToBlob(documentId, filename, bytes, contentType);
  }
  return saveDocumentFileToLocal(documentId, filename, bytes);
}

/** Load document bytes from local disk or Vercel Blob (by stored path/URL). */
export async function readDocumentFile(storagePath: string): Promise<Buffer> {
  if (storagePath === "pending" || storagePath.startsWith("pending:")) {
    throw new AppError("Document file was not stored successfully", {
      code: "STORAGE_ERROR",
      statusCode: 500,
    });
  }
  if (isRemoteStoragePath(storagePath)) {
    return readDocumentFileFromBlob(storagePath);
  }
  return readDocumentFileFromLocal(storagePath);
}

export { isRemoteStoragePath };
