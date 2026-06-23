import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(webRoot, ".env") });

import { prisma } from "../lib/prisma";

const documentId = process.argv[2] ?? "7f15565f-460c-421a-bd13-e4cba392eec1";

async function main() {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) {
    console.error("Document not found:", documentId);
    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify(
      {
        filename: doc.filename,
        mimeType: doc.mimeType,
        storagePath: doc.storagePath,
        extractionStatus: doc.extractionStatus,
        extractionError: doc.extractionError,
        textLength: doc.extractedText?.length ?? 0,
        textPreview: doc.extractedText?.slice(0, 200) ?? null,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
