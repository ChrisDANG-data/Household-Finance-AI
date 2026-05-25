/** Used by Document Intelligence Engine for constrained structuring (validated JSON output). */
export const DOCUMENT_PARSER_PROMPT = `Extract structured financial data from the provided document text.
Return JSON with fields: vendor, date, amount, currency, category, lineItems (if any).
If a field is unknown, use null. Do not invent values.`;
