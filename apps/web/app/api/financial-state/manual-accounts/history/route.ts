import { withAuthenticatedHandler } from "@/lib/api/authenticated-handler";
import { jsonSuccess } from "@/utils/api-response";
import { manualAccountHistoryService } from "@/services/manual-accounts/manual-account-history.service";

/** GET — manual account balance history chart series + recent snapshots */
export async function GET(request: Request) {
  return withAuthenticatedHandler(async (userId) => {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "30");

    const [series, recent] = await Promise.all([
      manualAccountHistoryService.getChartSeries(userId),
      manualAccountHistoryService.listRecent(userId, limit),
    ]);

    return jsonSuccess({ series, recent });
  });
}
