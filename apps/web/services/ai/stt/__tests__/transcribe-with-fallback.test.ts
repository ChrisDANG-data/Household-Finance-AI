import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    ai: {
      geminiApiKey: vi.fn(() => "test-gemini-key"),
    },
  },
}));

vi.mock("@/services/ai/stt/local-whisper-stt.service", () => ({
  transcribeAudioLocalWhisper: vi.fn(async () => {
    throw new Error("ffmpeg missing");
  }),
}));

vi.mock("@/services/ai/stt/gemini-stt.service", () => ({
  transcribeAudioWithGemini: vi.fn(async () => "hello from gemini"),
}));

import { transcribeWithFallback } from "@/services/ai/stt/transcribe-with-fallback";

describe("transcribeWithFallback", () => {
  it("falls back to Gemini when local Whisper fails", async () => {
    const result = await transcribeWithFallback(
      Buffer.from("fake-audio"),
      "audio/webm",
      "local",
    );

    expect(result).toEqual({
      text: "hello from gemini",
      provider: "gemini",
    });
  });
});
