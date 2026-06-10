import { describe, expect, it } from "vitest";

import {
  isComplexMultiAgentQuery,
  isForcedAnalystMode,
  resolveUseLangGraph,
  shouldUseLangGraph,
} from "../route-classifier";

describe("route-classifier", () => {
  it("detects complex affordability questions for LangGraph", () => {
    expect(isComplexMultiAgentQuery("Can I afford a $500/month car payment?")).toBe(
      true,
    );
    expect(isComplexMultiAgentQuery("What if my income drops by 20%?")).toBe(
      true,
    );
  });

  it("does not route simple month totals to LangGraph", () => {
    expect(isComplexMultiAgentQuery("Total expenses in August")).toBe(false);
    expect(
      shouldUseLangGraph("Total expenses in August"),
    ).toBe(false);
  });

  it("routes afford-another-car-lease questions to LangGraph", () => {
    expect(
      shouldUseLangGraph(
        "Can I afford another 500$/month car lease payment?",
      ),
    ).toBe(true);
  });

  it("routes investment increase questions to LangGraph", () => {
    expect(
      isComplexMultiAgentQuery(
        "Can I increase my investment 10000$ in August?",
      ),
    ).toBe(true);
  });

  it("routes balance trend questions to LangGraph", () => {
    expect(shouldUseLangGraph("What's my balance trend?")).toBe(true);
    expect(isComplexMultiAgentQuery("How is my checking balance changing over time?")).toBe(
      true,
    );
  });

  it("routes average MoM % forecast questions to LangGraph", () => {
    expect(
      shouldUseLangGraph("Average increase % over next 3 months?"),
    ).toBe(true);
  });

  it("forces LangGraph when analyst_mode is a specialist", () => {
    expect(isForcedAnalystMode("cost")).toBe(true);
    expect(shouldUseLangGraph("hello", "investment")).toBe(true);
    expect(shouldUseLangGraph("hello", "auto")).toBe(false);
  });

  it("resolveUseLangGraph skips LangGraph when langgraph_enabled is false", () => {
    expect(
      resolveUseLangGraph("Can I afford a $500/month car payment?", "auto", false),
    ).toBe(false);
    expect(
      resolveUseLangGraph("What's my balance trend?", "auto", false),
    ).toBe(false);
  });
});
