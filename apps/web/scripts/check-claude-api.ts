import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(webRoot, ".env") });

import { claudeClient } from "../services/ai/advisor/claude-client";
import { getAiProviderAvailability } from "../services/ai/llm/llm.service";

async function main() {
  const availability = getAiProviderAvailability();
  console.log("Provider availability:", availability);

  const key = process.env.ANTHROPIC_API_KEY?.trim() ?? "";
  console.log(
    "ANTHROPIC_API_KEY:",
    key ? `set (${key.slice(0, 8)}…${key.slice(-4)}, len=${key.length})` : "MISSING",
  );
  console.log("ANTHROPIC_MODEL:", process.env.ANTHROPIC_MODEL ?? "(default claude-haiku-4-5-20251001)");

  if (!availability.claude) {
    process.exitCode = 1;
    return;
  }

  const started = Date.now();
  const result = await claudeClient.complete({
    system: "Reply with exactly: pong",
    user: "ping",
    maxTokens: 16,
  });
  console.log("Claude OK in", Date.now() - started, "ms");
  console.log("Model:", result.model);
  console.log("Text:", JSON.stringify(result.text));
  if (result.usage) {
    console.log("Usage:", result.usage);
  }
}

main().catch((error) => {
  console.error("Claude call failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
