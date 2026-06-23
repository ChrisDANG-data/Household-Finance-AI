"use server";

import { syncObsidianVault } from "@/services/wiki/obsidian-vault.service";
import type { ObsidianWikiSyncResult } from "@/types/documents";

/** Runs the same vault compile + write as npm run sync:household-wiki. */
export async function syncObsidianVaultAction(): Promise<ObsidianWikiSyncResult> {
  return syncObsidianVault();
}
