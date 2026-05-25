import type {
  ScenarioChatRequest,
  ScenarioStreamEvent,
  StreamScenarioHandlers,
} from "./types";
import type { SerializedScenarioChatResponse } from "./types";

const SCENARIO_CHAT_API = "/api/scenario-chat";

export async function sendScenarioMessage(
  request: ScenarioChatRequest,
): Promise<SerializedScenarioChatResponse> {
  const response = await fetch(SCENARIO_CHAT_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...request, stream: false }),
  });

  const json = (await response.json()) as {
    success: boolean;
    data?: SerializedScenarioChatResponse;
    error?: { message: string };
  };

  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? "Scenario chat request failed");
  }

  return json.data;
}

function parseSseLine(line: string): ScenarioStreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  try {
    return JSON.parse(trimmed.slice(5).trim()) as ScenarioStreamEvent;
  } catch {
    return null;
  }
}

/**
 * Streams scenario chat via SSE — structured data first, then text deltas.
 */
export async function streamScenarioResponse(
  request: ScenarioChatRequest,
  handlers: StreamScenarioHandlers,
  signal?: AbortSignal,
): Promise<SerializedScenarioChatResponse> {
  const response = await fetch(SCENARIO_CHAT_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ ...request, stream: true }),
    signal,
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as {
      error?: { message: string };
    } | null;
    throw new Error(err?.error?.message ?? `Request failed (${response.status})`);
  }

  if (!response.body) {
    throw new Error("No response body for stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let finalData: SerializedScenarioChatResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const event = parseSseLine(line);
      if (!event) continue;

      switch (event.type) {
        case "structured":
          finalData = event.data;
          handlers.onStructured?.(event.data);
          break;
        case "text":
          fullText += event.delta;
          handlers.onTextDelta?.(event.delta, fullText);
          break;
        case "done":
          finalData = event.data;
          handlers.onDone?.(event.data);
          break;
        case "error":
          handlers.onError?.(event.message);
          throw new Error(event.message);
      }
    }
  }

  if (!finalData) {
    throw new Error("Stream ended without final scenario data");
  }

  return finalData;
}
