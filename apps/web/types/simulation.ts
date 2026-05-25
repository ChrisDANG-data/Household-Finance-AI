/**
 * Forecast Simulation Engine — deterministic inputs/outputs (no LLM).
 */

export interface ForecastInput {
  householdId: string;
  horizonMonths: number;
}

export interface ForecastOutput {
  householdId: string;
  engineVersion: string;
  projections: Array<{
    month: string;
    estimatedBalance: number;
    confidenceInterval?: { low: number; high: number };
  }>;
}

export interface ScenarioInput {
  householdId: string;
  name: string;
  assumptions: Record<string, number | string | boolean>;
}

export interface ScenarioOutput {
  scenarioId: string;
  engineVersion: string;
  outcomes: Record<string, number | string | boolean>;
}
