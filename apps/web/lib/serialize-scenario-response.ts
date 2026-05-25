import type { ScenarioChatResponse } from "@/services/scenario-chat/types";
import type { FinancialTimelineState } from "@/services/financial-state/state.types";
import type { FinancialEvent } from "@/services/financial-state/types";

export interface SerializedTimelineMonth {
  month: string;
  income_total: number;
  expense_total: number;
  net_cash_flow: number;
  active_event_ids: string[];
  active_event_categories: string[];
}

export interface SerializedScenarioChatResponse
  extends Omit<ScenarioChatResponse, "structured_data"> {
  structured_data: {
    timeline: SerializedTimelineMonth[];
    risk: ScenarioChatResponse["structured_data"]["risk"];
    baseline_timeline?: SerializedTimelineMonth[];
    baseline_risk?: ScenarioChatResponse["structured_data"]["risk"];
    advice?: ScenarioChatResponse["structured_data"]["advice"];
  };
}

function serializeTimeline(
  timeline: FinancialTimelineState[],
): SerializedTimelineMonth[] {
  return timeline.map((m) => ({
    month: m.month,
    income_total: m.income_total,
    expense_total: m.expense_total,
    net_cash_flow: m.net_cash_flow,
    active_event_ids: m.active_events.map((e: FinancialEvent) => e.id),
    active_event_categories: m.active_events.map((e: FinancialEvent) => e.category),
  }));
}

export function serializeScenarioChatResponse(
  response: ScenarioChatResponse,
): SerializedScenarioChatResponse {
  return {
    ...response,
    structured_data: {
      timeline: serializeTimeline(response.structured_data.timeline),
      risk: response.structured_data.risk,
      baseline_timeline: response.structured_data.baseline_timeline
        ? serializeTimeline(response.structured_data.baseline_timeline)
        : undefined,
      baseline_risk: response.structured_data.baseline_risk,
      advice: response.structured_data.advice,
    },
  };
}
