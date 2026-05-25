import type { ForecastInput, ForecastOutput } from "@/types/simulation";
import { AppError } from "@/utils/errors";

/**
 * Forecast Simulation Engine — deterministic cash-flow and balance projections.
 * No LLM calls. Reads canonical state from Financial State Engine only.
 */
export class ForecastingEngineService {
  async generateForecast(_input: ForecastInput): Promise<ForecastOutput> {
    throw new AppError("Forecasting not implemented", {
      code: "NOT_IMPLEMENTED",
      statusCode: 501,
    });
  }
}

export const forecastingEngineService = new ForecastingEngineService();
