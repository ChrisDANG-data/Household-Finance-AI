import { describe, expect, it } from "vitest";

import {
  extractDeterministicSummary,
  looksTruncatedSummary,
} from "../writer.service";

const DETAIL_WITH_PCT = `### Investment analyst
#### Forecast cash (household ledger)
- Starting cash today: $79,771.82 CAD
- Average month-over-month increase (3 months): +7.40%
- Total growth over 3 months: +23.88%
- Trend: $79,771.82 → $98,825.82 over 3 months (+$19,054.00 total)`;

describe("writer.service", () => {
  it("extracts average MoM summary from specialist detail", () => {
    const summary = extractDeterministicSummary(
      DETAIL_WITH_PCT,
      "average increase percentage in following 3 months",
    );
    expect(summary).toContain("+7.40%");
    expect(summary).toContain("next 3 months");
    expect(summary).toMatch(/\.$/);
  });

  it("detects truncated LLM output", () => {
    expect(
      looksTruncatedSummary(
        "Your average month-over-month balance increase for the next",
      ),
    ).toBe(true);
    expect(
      looksTruncatedSummary(
        "Your average month-over-month balance increase for the next 3 months is +7.40%.",
      ),
    ).toBe(false);
  });
});
