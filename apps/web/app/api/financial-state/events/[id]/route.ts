import { jsonSuccess } from "@/utils/api-response";
import { withApiHandler } from "@/lib/api/route-handler";
import { serializeFinancialEvent } from "@/lib/serializers/financial-state";
import {
  financialStatePersistence,
  type UpdateFinancialEventInput,
} from "@/services/financial-state/financial-state.persistence";

/** GET — single FinancialEvent */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withApiHandler(async () => {
    const { id } = await context.params;
    const event = await financialStatePersistence.getEvent(id);
    return jsonSuccess({ event: serializeFinancialEvent(event) });
  });
}

/** PATCH — update FinancialEvent */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withApiHandler(async () => {
    const { id } = await context.params;
    const body = (await request.json()) as UpdateFinancialEventInput;
    const event = await financialStatePersistence.updateEvent(id, body);
    return jsonSuccess({ event: serializeFinancialEvent(event) });
  });
}

/** DELETE — remove FinancialEvent */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withApiHandler(async () => {
    const { id } = await context.params;
    await financialStatePersistence.deleteEvent(id);
    return jsonSuccess({ deleted: true });
  });
}
