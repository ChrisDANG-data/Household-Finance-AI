import { withAuthenticatedHandler } from "@/lib/api/authenticated-handler";
import { syncObsidianVault } from "@/services/wiki/obsidian-vault.service";
import { jsonSuccess } from "@/utils/api-response";

export const runtime = "nodejs";

/** POST — Rebuild the signed-in user's wiki notes and write to OBSIDIAN_VAULT_PATH when configured */
export async function POST() {
  return withAuthenticatedHandler(async (userId) => {
    const result = await syncObsidianVault(userId);
    return jsonSuccess(result);
  });
}
