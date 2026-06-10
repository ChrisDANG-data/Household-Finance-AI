# LLM calls summary

Synced: 2026-06-10T04:28:18.453Z
Source: [[../../apps/web/logs/llm-calls.jsonl]] (repo; not copied — summaries only)

## Totals
- Calls: 52
- Success: 45
- Failed: 7
- Est. cost (USD): $0.1758

## By provider
- gemini: 23
- claude: 29

## By caller
- scenario-chat-document: 37
- financial-advisor: 8
- langgraph-writer: 6
- document-extraction: 1

## By date
- 2026-05-27: 5
- 2026-05-28: 3
- 2026-05-30: 14
- 2026-06-01: 3
- 2026-06-07: 9
- 2026-06-08: 14
- 2026-06-09: 4

## Recent failures (sanitized)
- 2026-05-27T23:28:37.989Z · gemini · scenario-chat-document · Gemini API error: 404 {
- 2026-05-27T23:28:38.285Z · gemini · financial-advisor · Gemini API error: 404 {
- 2026-05-27T23:29:18.027Z · gemini · scenario-chat-document · Gemini API error: 404 {
- 2026-05-27T23:29:18.530Z · gemini · financial-advisor · Gemini API error: 404 {
- 2026-05-28T05:28:03.788Z · claude · scenario-chat-document · Claude API error: 404 {"type":"error","error":{"type":"not_found_error","message":"model: claude-3-5-haiku-20241022"},"r
- 2026-05-28T05:28:04.665Z · claude · financial-advisor · Claude API error: 404 {"type":"error","error":{"type":"not_found_error","message":"model: claude-3-5-haiku-20241022"},"r
- 2026-06-08T21:11:32.994Z · gemini · financial-advisor · Gemini API error: 503 {

## Notes
- Full prompts/responses stay in jsonl locally; do not paste API keys into Obsidian.
- Link: [[05_AI_Learnings/LLM Provider Notes]]
