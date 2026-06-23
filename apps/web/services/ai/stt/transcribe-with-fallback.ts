import { env } from "@/lib/env";
import { transcribeAudioWithGemini } from "@/services/ai/stt/gemini-stt.service";
import { transcribeAudioLocalWhisper } from "@/services/ai/stt/local-whisper-stt.service";
import { AppError } from "@/utils/errors";

type SttProvider = "gemini" | "local";

async function transcribeWithFallback(
  buffer: Buffer,
  mimeType: string,
  provider: SttProvider,
): Promise<{ text: string; provider: SttProvider }> {
  if (provider === "gemini") {
    return {
      text: await transcribeAudioWithGemini(buffer.toString("base64"), mimeType),
      provider: "gemini",
    };
  }

  try {
    return {
      text: await transcribeAudioLocalWhisper(buffer, mimeType),
      provider: "local",
    };
  } catch (localError) {
    if (!env.ai.geminiApiKey()) throw localError;
    return {
      text: await transcribeAudioWithGemini(buffer.toString("base64"), mimeType),
      provider: "gemini",
    };
  }
}

export { transcribeWithFallback, type SttProvider };
