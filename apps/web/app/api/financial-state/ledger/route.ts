import { jsonSuccess } from "@/utils/api-response";
import { withApiHandler } from "@/lib/api/route-handler";
import { obligationService } from "@/services/financial-state/obligation.service";
import { currentUtcMonth } from "@/services/financial-state/dates";

/** GET — household obligations ledger (MVP) */
export async function GET(request: Request) {
  return withApiHandler(async () => {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? currentUtcMonth();

    const [obligations, summary] = await Promise.all([
      obligationService.list(),
      obligationService.getMonthlySummary(month),
    ]);

    return jsonSuccess({
      household_id: "default",
      obligations,
      summary,
    });
  });
}
