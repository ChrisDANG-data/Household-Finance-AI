import type { ScenarioInput, ScenarioOutput } from "@/types/simulation";
import { AppError } from "@/utils/errors";

/**
 * Forecast Simulation Engine — deterministic what-if scenario modeling.
 * No LLM calls. Pure calculation over canonical financial state + assumptions.
 */
export class ScenarioSimulationService {
  async runSimulation(_input: ScenarioInput): Promise<ScenarioOutput> {
    throw new AppError("Scenario simulation not implemented", {
      code: "NOT_IMPLEMENTED",
      statusCode: 501,
    });
  }
}

export const scenarioSimulationService = new ScenarioSimulationService();
