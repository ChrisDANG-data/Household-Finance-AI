import { withAuthenticatedHandler } from "@/lib/api/authenticated-handler";
import { jsonSuccess } from "@/utils/api-response";
import { AppError } from "@/utils/errors";
import {
  serializeFinancialState,
  serializeTimeline,
} from "@/lib/serializers/financial-state";
import {
  financialStatePersistence,
  type UpsertFinancialStateInput,
} from "@/services/financial-state/financial-state.persistence";

/** GET — load FinancialState (computed fields derived, not stored) + optional timeline */
export async function GET(request: Request) {
  return withAuthenticatedHandler(async (userId) => {
    const { searchParams } = new URL(request.url);
    const months = Number(searchParams.get("months") ?? "0");
    const includeTimeline = searchParams.get("timeline") === "true" || months > 0;

    const state = await financialStatePersistence.loadState(userId);
    const payload: Record<string, unknown> = {
      state: serializeFinancialState(state),
    };

    if (includeTimeline) {
      const timeline = await financialStatePersistence.buildTimeline(
        userId,
        months > 0 ? months : 12,
        searchParams.get("start_month") ?? undefined,
      );
      payload.timeline = serializeTimeline(timeline);
    }

    return jsonSuccess(payload);
  });
}

/** PUT — upsert FinancialState scalars (current_cash, monthly_income) */
export async function PUT(request: Request) {
  return withAuthenticatedHandler(async (userId) => {
    const body = (await request.json()) as UpsertFinancialStateInput;
    if (typeof body.current_cash !== "number") {
      throw new AppError("current_cash is required", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }
    if (body.current_cash < 0) {
      throw new AppError("current_cash must be >= 0", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }
    if (body.balance_source != null && body.balance_source !== "plaid" && body.balance_source !== "manual") {
      throw new AppError("balance_source must be plaid or manual", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }
    for (const [field, value] of [
      ["partner_a_opening_cash", body.partner_a_opening_cash],
      ["partner_b_opening_cash", body.partner_b_opening_cash],
      ["manual_checking", body.manual_checking],
      ["manual_savings", body.manual_savings],
      ["manual_cash_management", body.manual_cash_management],
      ["manual_investment", body.manual_investment],
      ["manual_credit_owed", body.manual_credit_owed],
    ] as const) {
      if (value != null && (typeof value !== "number" || value < 0)) {
        throw new AppError(`${field} must be a non-negative number or null`, {
          code: "VALIDATION_ERROR",
          statusCode: 400,
        });
      }
    }
    const state = await financialStatePersistence.upsertStateScalars({
      ...body,
      user_id: userId,
    });
    return jsonSuccess({ state: serializeFinancialState(state) });
  });
}
