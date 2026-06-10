import { describe, expect, it } from "vitest";

import {
  extractTargetMonth,
  monthLabel,
} from "@/services/scenario-chat/monthly-lookup";

describe("monthly-lookup", () => {
  it("extracts July from income question", () => {
    const month = extractTargetMonth("what is the income in July");
    expect(month).toMatch(/-07$/);
    expect(monthLabel(month!)).toMatch(/July/);
  });

  it("extracts July 2026 explicitly", () => {
    expect(extractTargetMonth("income in July 2026")).toBe("2026-07");
  });
});
