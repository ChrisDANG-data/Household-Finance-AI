import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { AppError } from "@/utils/errors";
import { getExtensionFromFilename } from "@/utils/file";

const UPLOAD_ROOT = path.join(process.cwd(), ".data", "uploads");

function sanitizeFilename(filename: string): string {
  const base = path.basename(filename).replace(/[^\w.\-()+ ]/g, "_");
  return base.length > 0 ? base.slice(0, 200) : "upload";
}

export function getUploadRoot(): string {
  return UPLOAD_ROOT;
}

export async function saveDocumentFile(
  documentId: string,
  filename: string,
  bytes: Buffer,
): Promise<string> {
  await mkdir(UPLOAD_ROOT, { recursive: true });
  const ext = getExtensionFromFilename(filename);
  const safeName = sanitizeFilename(filename);
  const storageName = ext
    ? `${documentId}-${safeName}`
    : `${documentId}-${safeName}`;
  const storagePath = path.join(UPLOAD_ROOT, storageName);

  if (!storagePath.startsWith(UPLOAD_ROOT)) {
    throw new AppError("Invalid storage path", {
      code: "STORAGE_ERROR",
      statusCode: 500,
    });
  }

  await writeFile(storagePath, bytes);
  return storagePath;
}

export function resolveStoragePath(storagePath: string): string {
  const resolved = path.resolve(storagePath);
  if (!resolved.startsWith(path.resolve(UPLOAD_ROOT))) {
    throw new AppError("Invalid document storage path", {
      code: "STORAGE_ERROR",
      statusCode: 400,
    });
  }
  return resolved;
}
