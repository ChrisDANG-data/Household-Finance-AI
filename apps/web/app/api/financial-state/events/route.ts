import { jsonSuccess } from "@/utils/api-response";
import { withApiHandler } from "@/lib/api/route-handler";
import { serializeFinancialEvent } from "@/lib/serializers/financial-state";
import {
  DEFAULT_USER_ID,
  financialStatePersistence,
  type CreateFinancialEventInput,
} from "@/services/financial-state/financial-state.persistence";

/** GET — list canonical FinancialEvent rows for a user */
export async function GET(request: Request) {
  return withApiHandler(async () => {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id") ?? DEFAULT_USER_ID;
    const events = await financialStatePersistence.listEvents(userId);
    return jsonSuccess({
      user_id: userId,
      events: events.map(serializeFinancialEvent),
    });
  });
}

/** POST — create canonical FinancialEvent */
export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = (await request.json()) as CreateFinancialEventInput;
    const event = await financialStatePersistence.createEvent(body);
    return jsonSuccess({ event: serializeFinancialEvent(event) }, { status: 201 });
  });
}
