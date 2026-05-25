/**
 * AI Explanation Layer — read-only reasoning contracts (LLM-only).
 */

export interface ExplanationRequest {
  householdId: string;
  /** Read-only snapshot IDs produced by other engines */
  context: {
    ledgerSnapshotId?: string;
    forecastSnapshotId?: string;
    scenarioSnapshotId?: string;
    documentRagQueryId?: string;
  };
  userMessage: string;
  schemaId: string;
  schemaVersion: string;
}

export interface ExplanationResponse {
  message: string;
  schemaId: string;
  schemaVersion: string;
  citations?: Array<{ source: string; excerpt: string }>;
}

export interface NarrationRequest {
  explanationId: string;
  text: string;
  voiceId?: string;
  format?: "mp3" | "wav" | "ogg";
}
