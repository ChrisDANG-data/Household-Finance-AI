import { withAuthenticatedHandler } from "@/lib/api/authenticated-handler";
import { syncObsidianVault } from "@/services/wiki/obsidian-vault.service";
import { jsonSuccess } from "@/utils/api-response";

export const runtime = "nodejs";

/** @deprecated Use /api/obsidian-vault/sync */
export async function POST() {
  return withAuthenticatedHandler(async (userId) => {
    const result = await syncObsidianVault(userId);
    return jsonSuccess(result);
  });
}
