import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { PassThrough } from "node:stream";

import { env } from "@/lib/env";
import {
  compileWikiVault,
  HOUSEHOLD_WIKI_ROOT,
  type WikiCompileResult,
  type WikiFile,
} from "@/services/wiki/compile-wiki.service";
import { AppError } from "@/utils/errors";

export interface ObsidianSyncResult {
  pageCount: number;
  documentCount: number;
  categoryCount: number;
  eventCount: number;
  vaultSynced: boolean;
  vaultPath: string | null;
  message: string;
  removedPaths?: string[];
}

/** Pre-Household/ layout at vault root — safe to delete on sync. */
const LEGACY_WIKI_ROOT_PATHS = [
  "Documents",
  "Categories",
  "Ledger",
  "Events",
  "Household Index.md",
];

function normalizeVaultRelativePath(relativePath: string): string {
  return relativePath.replace(/\\/g, "/");
}

async function pruneOrphanMarkdown(
  dir: string,
  activePaths: Set<string>,
  relativePrefix: string,
  removed: string[],
): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const relativePath = normalizeVaultRelativePath(
      `${relativePrefix}/${entry.name}`,
    );
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await pruneOrphanMarkdown(fullPath, activePaths, relativePath, removed);
      continue;
    }

    if (!entry.name.endsWith(".md")) continue;
    if (activePaths.has(relativePath)) continue;

    await rm(fullPath, { force: true });
    removed.push(relativePath);
  }
}

async function cleanupStaleVaultFiles(
  vaultPath: string,
  files: WikiFile[],
): Promise<string[]> {
  const resolved = path.resolve(vaultPath);
  const removed: string[] = [];
  const activePaths = new Set(
    files.map((file) => normalizeVaultRelativePath(file.path)),
  );

  for (const legacyPath of LEGACY_WIKI_ROOT_PATHS) {
    const fullPath = path.join(resolved, legacyPath);
    try {
      await rm(fullPath, { recursive: true, force: true });
      removed.push(legacyPath);
    } catch {
      // already gone
    }
  }

  const staleHouseholdIndex = path.join(
    resolved,
    HOUSEHOLD_WIKI_ROOT,
    "Household Index.md",
  );
  try {
    await rm(staleHouseholdIndex, { force: true });
    removed.push(`${HOUSEHOLD_WIKI_ROOT}/Household Index.md`);
  } catch {
    // already gone
  }

  await pruneOrphanMarkdown(
    path.join(resolved, HOUSEHOLD_WIKI_ROOT),
    activePaths,
    HOUSEHOLD_WIKI_ROOT,
    removed,
  );

  return removed;
}

async function writeVaultFiles(
  vaultPath: string,
  files: WikiFile[],
): Promise<void> {
  const resolved = path.resolve(vaultPath);
  await mkdir(resolved, { recursive: true });

  for (const file of files) {
    const fullPath = path.join(resolved, file.path);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.content, "utf8");
  }
}

export async function buildVaultZipBuffer(files: WikiFile[]): Promise<Buffer> {
  const archiver = (await import("archiver")).default;

  return new Promise((resolve, reject) => {
    const passthrough = new PassThrough();
    const chunks: Buffer[] = [];

    passthrough.on("data", (chunk: Buffer) => chunks.push(chunk));
    passthrough.on("end", () => resolve(Buffer.concat(chunks)));
    passthrough.on("error", reject);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", reject);
    archive.pipe(passthrough);

    for (const file of files) {
      archive.append(file.content, { name: file.path.replace(/\\/g, "/") });
    }

    void archive.finalize();
  });
}

export async function syncObsidianVault(): Promise<ObsidianSyncResult> {
  const compiled = await compileWikiVault();
  const vaultPath = env.obsidian.vaultPath();

  if (!vaultPath) {
    return {
      pageCount: compiled.pageCount,
      documentCount: compiled.documentCount,
      categoryCount: compiled.categoryCount,
      eventCount: compiled.eventCount,
      vaultSynced: false,
      vaultPath: null,
      message:
        "Wiki compiled. Set OBSIDIAN_VAULT_PATH in .env to sync locally, or download the ZIP export.",
    };
  }

  try {
    await writeVaultFiles(vaultPath, compiled.files);
    const removedPaths = await cleanupStaleVaultFiles(vaultPath, compiled.files);
    const removedNote =
      removedPaths.length > 0
        ? ` Removed ${removedPaths.length} stale note(s).`
        : "";
    return {
      pageCount: compiled.pageCount,
      documentCount: compiled.documentCount,
      categoryCount: compiled.categoryCount,
      eventCount: compiled.eventCount,
      vaultSynced: true,
      vaultPath: path.resolve(vaultPath),
      message: `Wrote ${compiled.pageCount} note(s) to Obsidian vault.${removedNote}`,
      removedPaths,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Vault write failed";
    throw new AppError(`Obsidian vault sync failed: ${msg}`, {
      code: "VAULT_SYNC_FAILED",
      statusCode: 500,
    });
  }
}

export async function exportObsidianVaultZip(): Promise<{
  buffer: Buffer;
  compiled: WikiCompileResult;
}> {
  const compiled = await compileWikiVault();
  const buffer = await buildVaultZipBuffer(compiled.files);
  return { buffer, compiled };
}
