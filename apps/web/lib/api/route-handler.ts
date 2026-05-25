import { jsonError } from "@/utils/api-response";
import { toAppError } from "@/utils/errors";

export async function withApiHandler<T>(
  handler: () => Promise<T>,
): Promise<T | ReturnType<typeof jsonError>> {
  try {
    return await handler();
  } catch (error) {
    return jsonError(toAppError(error)) as T;
  }
}
