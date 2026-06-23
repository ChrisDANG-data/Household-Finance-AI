import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(webRoot, ".env") });

import { prisma } from "../lib/prisma";

const documentId = process.argv[2] ?? "7f15565f-460c-421a-bd13-e4cba392eec1";

async function main() {
  const { documentRepository } = await import(
    "../services/document-intelligence/document.repository"
  );

  const result = await documentRepository.runExtraction(documentId);
  console.log(
    JSON.stringify(
      {
        extractionStatus: result.document.extractionStatus,
        extractionError: result.document.extractionError,
        textLength: result.document.extractedText?.length ?? 0,
        chunksIndexed: result.processing.chunksIndexed,
        wikiPagesWritten: result.processing.wikiPagesWritten,
        obsidianVaultSynced: result.processing.obsidianVaultSynced,
        warnings: result.processing.warnings,
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
