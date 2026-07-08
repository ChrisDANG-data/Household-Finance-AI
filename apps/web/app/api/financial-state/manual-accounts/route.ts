import { withAuthenticatedHandler } from "@/lib/api/authenticated-handler";
import { jsonSuccess } from "@/utils/api-response";
import { AppError } from "@/utils/errors";
import { manualAccountService } from "@/services/manual-accounts/manual-account.service";
import type { SaveManualSnapshotInput } from "@/services/manual-accounts/manual-account.types";

/** GET — list manual accounts for a snapshot date (+ available dates). */
export async function GET(request: Request) {
  return withAuthenticatedHandler(async (userId) => {
    const { searchParams } = new URL(request.url);
    const date =
      searchParams.get("date") ?? searchParams.get("month") ?? undefined;

    const [snapshot, snapshot_dates] = await Promise.all([
      manualAccountService.listForDate(userId, date),
      manualAccountService.listSnapshotDates(userId),
    ]);

    return jsonSuccess({
      snapshot_date: snapshot.snapshot_date,
      accounts: snapshot.accounts,
      snapshot_dates,
    });
  });
}

/** PUT — replace all accounts for a snapshot date. */
export async function PUT(request: Request) {
  return withAuthenticatedHandler(async (userId) => {
    const body = (await request.json()) as SaveManualSnapshotInput & {
      snapshot_month?: string;
    };
    const snapshot_date = body.snapshot_date ?? body.snapshot_month;
    if (!snapshot_date) {
      throw new AppError("snapshot_date is required", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }
    const result = await manualAccountService.saveSnapshot(userId, {
      snapshot_date,
      accounts: body.accounts,
    });
    return jsonSuccess(result);
  });
}
