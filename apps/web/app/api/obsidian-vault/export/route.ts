import { NextResponse } from "next/server";

import { withAuthenticatedHandler } from "@/lib/api/authenticated-handler";
import { exportObsidianVaultZip } from "@/services/wiki/obsidian-vault.service";

export const runtime = "nodejs";

/** GET — Download the signed-in user's compiled Obsidian vault as a ZIP */
export async function GET() {
  return withAuthenticatedHandler(async (userId) => {
    const { buffer, compiled } = await exportObsidianVaultZip(userId);
    const filename = `finintel-obsidian-vault-${new Date().toISOString().slice(0, 10)}.zip`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Wiki-Page-Count": String(compiled.pageCount),
      },
    });
  });
}
