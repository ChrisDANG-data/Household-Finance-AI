import { describe, expect, it, vi } from "vitest";

import { LedgerEventAutomationService } from "../ledger-event.service";

vi.mock("@/services/financial-state/financial-state.persistence", () => ({
  DEFAULT_USER_ID: "default",
  financialStatePersistence: {
    createEvent: vi.fn(async (input) => ({
      id: "evt-1",
      type: input.type,
      category: input.category,
      amount: input.amount,
      currency: input.currency ?? "CAD",
      frequency: input.frequency,
      start_date: new Date(`${input.start_date}T00:00:00.000Z`),
      end_date: input.end_date
        ? new Date(`${input.end_date}T00:00:00.000Z`)
        : null,
      event_date: null,
      account_in: null,
      account_out: null,
      owner: input.owner ?? "partner_a",
      confidence: 1,
      source_document_id: null,
      metadata: undefined,
    })),
  },
}));

describe("LedgerEventAutomationService", () => {
  const service = new LedgerEventAutomationService();

  it("persists by default when confirm is omitted", async () => {
    const result = await service.handle({
      kind: "expense",
      category: "utilities",
      amount: 120,
      frequency: "monthly",
      start_date: "2026-06-01",
    });

    expect(result.status).toBe("saved");
    expect(result.reply).toContain("Saved:");
  });

  it("returns preview when confirm is false", async () => {
    const result = await service.handle({
      kind: "expense",
      category: "rent",
      amount: 500,
      frequency: "monthly",
      start_date: "2026-06-01",
      confirm: false,
    });

    expect(result.status).toBe("preview");
    expect(result.reply).toContain("Save expense rent");
    expect(result.reply).toContain("Reply yes to confirm");
    expect(result.preview.type).toBe("recurring_expense");
    expect(result.event).toBeUndefined();
  });

  it("persists when confirm is true", async () => {
    const result = await service.handle({
      kind: "income",
      category: "salary",
      amount: 4400,
      frequency: "monthly",
      start_date: "2026-06-01",
      confirm: true,
    });

    expect(result.status).toBe("saved");
    expect(result.reply).toContain("Saved:");
    expect(result.event?.category).toBe("salary");
  });

  it("infers one_time from month hint", async () => {
    const result = await service.handle({
      kind: "expense",
      category: "grocery",
      amount: 800,
      month: "May",
      owner: "partner_b",
      confirm: false,
    });

    expect(result.preview.frequency).toBe("one_time");
    expect(result.preview.type).toBe("one_time_expense");
    expect(result.preview.start_date).toMatch(/-05-01$/);
    expect(result.preview.owner).toBe("partner_b");
  });

  it("defaults owner to partner_a when omitted", async () => {
    const result = await service.handle({
      kind: "income",
      category: "salary",
      amount: 4400,
      frequency: "monthly",
      confirm: false,
    });

    expect(result.preview.owner).toBe("partner_a");
  });

  it("maps explicit one_time expense", async () => {
    const result = await service.handle({
      kind: "expense",
      category: "repair",
      amount: 200,
      frequency: "one_time",
      start_date: "2026-06-01",
      confirm: false,
    });

    expect(result.preview.type).toBe("one_time_expense");
  });
});
