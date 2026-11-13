"use server";

import { resolveRequestUserId } from "@/lib/auth/request-user";
import { syncObsidianVault } from "@/services/wiki/obsidian-vault.service";
import type { ObsidianWikiSyncResult } from "@/types/documents";

/** Runs the vault compile + write for the signed-in user only. */
export async function syncObsidianVaultAction(): Promise<ObsidianWikiSyncResult> {
  const userId = await resolveRequestUserId();
  return syncObsidianVault(userId);
}
