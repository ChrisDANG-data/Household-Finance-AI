import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    isVercel: vi.fn(() => false),
  },
}));

vi.mock("@/services/ai/stt/local-whisper-stt.service", () => ({
  transcribeAudioLocalWhisper: vi.fn(async () => {
    throw new Error("ffmpeg missing");
  }),
}));

vi.mock("@/services/ai/stt/whisper-stt.service", () => ({
  transcribeAudioWithWhisper: vi.fn(async () => "hello from cloud whisper"),
}));

import { env } from "@/lib/env";
import { transcribeWithFallback } from "@/services/ai/stt/transcribe-with-fallback";

describe("transcribeWithFallback", () => {
  afterEach(() => {
    vi.mocked(env.isVercel).mockReturnValue(false);
  });

  it("rejects local STT on Vercel with a clear message", async () => {
    vi.mocked(env.isVercel).mockReturnValue(true);
    await expect(
      transcribeWithFallback(Buffer.from("fake-audio"), "audio/webm", "local"),
    ).rejects.toThrow(/Vercel/i);
  });

  it("uses cloud Whisper when provider is whisper", async () => {
    const result = await transcribeWithFallback(
      Buffer.from("fake-audio"),
      "audio/webm",
      "whisper",
    );

    expect(result).toEqual({
      text: "hello from cloud whisper",
      provider: "whisper",
    });
  });

  it("reports a clear error when local Whisper fails", async () => {
    await expect(
      transcribeWithFallback(Buffer.from("fake-audio"), "audio/webm", "local"),
    ).rejects.toThrow(/Local voice recognition failed/i);
  });
});
