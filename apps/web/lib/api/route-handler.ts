import { jsonError } from "@/utils/api-response";
import { toAppError } from "@/utils/errors";

/** Next.js App Router route handlers must return Response (or void). */
export async function withApiHandler(
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    return jsonError(toAppError(error));
  }
}
