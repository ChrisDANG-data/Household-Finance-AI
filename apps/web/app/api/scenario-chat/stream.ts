import type { ScenarioChatResponse } from "@/services/scenario-chat/types";

import { serializeScenarioChatResponse } from "./serialize";

export type StreamEvent =
  | { type: "structured"; data: ReturnType<typeof serializeScenarioChatResponse> }
  | { type: "text"; delta: string }
  | { type: "done"; data: ReturnType<typeof serializeScenarioChatResponse> }
  | { type: "error"; message: string };

const STREAM_CHUNK_MS = 14;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Text fields streamed incrementally to the client. */
function buildStreamableText(response: ScenarioChatResponse): string {
  const parts = [
    response.financial_summary,
    "",
    response.explanation,
    "",
    response.recommendation ? `Recommendation: ${response.recommendation}` : "",
  ].filter(Boolean);

  return parts.join("\n");
}

export function createScenarioChatStream(
  response: ScenarioChatResponse,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const serialized = serializeScenarioChatResponse(response);
  const streamText = buildStreamableText(response);

  return new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };

      try {
        send({ type: "structured", data: serialized });

        const tokens = streamText.split(/(\s+)/).filter((t) => t.length > 0);
        for (const token of tokens) {
          send({ type: "text", delta: token });
          await sleep(STREAM_CHUNK_MS);
        }

        send({ type: "done", data: serialized });
      } catch (error) {
        send({
          type: "error",
          message:
            error instanceof Error ? error.message : "Stream failed",
        });
      } finally {
        controller.close();
      }
    },
  });
}
