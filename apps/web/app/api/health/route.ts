import { financialStateRepository } from "@/services/financial-state";
import { jsonSuccess } from "@/utils/api-response";

export async function GET() {
  const database = await financialStateRepository.healthCheck();

  return jsonSuccess({
    status: "ok",
    timestamp: new Date().toISOString(),
    engines: {
      financialState: { database },
    },
  });
}
