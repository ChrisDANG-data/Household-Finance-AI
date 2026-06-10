import { describe, expect, it } from "vitest";

import { wikiLink, wikiSlug } from "@/services/wiki/wiki-slug";

describe("wikiSlug", () => {
  it("slugifies category names", () => {
    expect(wikiSlug("car_lease")).toBe("car-lease");
    expect(wikiSlug("  House Insurance!! ")).toBe("house-insurance");
  });

  it("falls back for empty input", () => {
    expect(wikiSlug("!!!")).toBe("untitled");
  });
});

describe("wikiLink", () => {
  it("wraps paths in wikilink syntax", () => {
    expect(wikiLink("Household Index")).toBe("[[Household Index]]");
    expect(wikiLink("Categories/car-lease")).toBe("[[Categories/car-lease]]");
  });
});
