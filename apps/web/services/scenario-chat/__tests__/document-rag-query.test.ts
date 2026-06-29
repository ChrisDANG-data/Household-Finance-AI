import { describe, expect, it } from "vitest";

import {
  isDocumentProseQuery,
  isLedgerLookupQuestion,
  shouldPreferDocumentRag,
} from "../document-rag-query";

describe("document-rag-query", () => {
  it("detects insurance policy document questions", () => {
    expect(
      isDocumentProseQuery("What is my house insurance policy number?"),
    ).toBe(true);
    expect(
      isDocumentProseQuery("What does my home insurance policy say about coverage?"),
    ).toBe(true);
    expect(isDocumentProseQuery("What is the deductible on my car insurance?")).toBe(
      true,
    );
  });

  it("does not treat payment lookups as document prose", () => {
    expect(isDocumentProseQuery("How much is my house insurance payment?")).toBe(
      false,
    );
    expect(isDocumentProseQuery("What is my house insurance premium per month?")).toBe(
      false,
    );
  });

  it("classifies ledger lookup questions", () => {
    expect(isLedgerLookupQuestion("Total expenses in May 2026")).toBe(true);
    expect(isLedgerLookupQuestion("What is my income in July?")).toBe(true);
    expect(
      isLedgerLookupQuestion("What is my house insurance policy number?"),
    ).toBe(false);
  });

  it("prefers document RAG for policy questions even with ledger data implied", () => {
    expect(
      shouldPreferDocumentRag("What is my house insurance policy number?", 0.1),
    ).toBe(true);
  });

  it("prefers document RAG on strong chunk match for non-ledger questions", () => {
    expect(shouldPreferDocumentRag("Tell me about my lease agreement", 0.35)).toBe(
      true,
    );
    expect(shouldPreferDocumentRag("Tell me about my lease agreement", 0.15)).toBe(
      false,
    );
  });

  it("does not prefer document RAG for month totals", () => {
    expect(shouldPreferDocumentRag("Total expenses in May 2026", 0.9)).toBe(
      false,
    );
  });
});
