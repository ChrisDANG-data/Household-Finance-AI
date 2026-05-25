/**
 * Financial State Engine — public API
 *
 * Core canonical model (step 1):
 *   types.ts, normalize.ts → FinancialEvent + normalizeFinancialEvents()
 */

export type {
  FinancialEvent,
  FinancialEventFrequency,
  FinancialEventMetadata,
  FinancialEventType,
  RawFinancialEvent,
} from "./types";

export { DEFAULT_CURRENCY } from "./types";

export {
  normalizeFinancialEvents,
  normalizeEvents,
  parseToDate,
} from "./normalize";

export {
  FinancialStateEngine,
  financialStateEngine,
  type CreateStateInput,
} from "./engine";

export {
  buildFinancialState,
  computeDerivedFields,
  frequencyAppliesInMonth,
  isEventActiveInTargetMonth,
  isOneTimeInTargetMonth,
  isYearlyAnniversaryMonth,
  monthlyEquivalentAmount,
  projectMonth,
  simulateForecast,
} from "./projection";
export {
  computeRiskSignals,
  toFinancialRiskSignals,
  type FinancialRiskMetrics,
  type FinancialRiskReport,
  type FinancialRiskSignals,
  type RiskAnalysisContext,
} from "./risk";

export type {
  CashFlowRiskLevel,
  FinancialState,
  FinancialStateComputed,
  FinancialTimelineState,
  SimulateForecastOptions,
} from "./state.types";

export {
  CanonicalEventService,
  canonicalEventService,
} from "./canonical-event.service";
export {
  ConversationStoreService,
  conversationStoreService,
} from "./conversation-store.service";
export {
  FinancialStateRepository,
  financialStateRepository,
} from "./repository.service";
export {
  ObligationService,
  obligationService,
  type CreateObligationInput,
  type UpdateObligationInput,
} from "./obligation.service";
export {
  computeMonthlyObligationSummary,
  type MonthlyObligationSummary,
} from "./obligation-summary";
export {
  FinancialStatePersistence,
  financialStatePersistence,
  DEFAULT_USER_ID,
  type CreateFinancialEventInput,
  type UpdateFinancialEventInput,
  type UpsertFinancialStateInput,
} from "./financial-state.persistence";
export { prismaEventToDomain, parseEventMetadata } from "./event.mapper";
