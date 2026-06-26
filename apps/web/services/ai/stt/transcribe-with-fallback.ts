import { env } from "@/lib/env";
import { transcribeAudioWithGemini } from "@/services/ai/stt/gemini-stt.service";
import { transcribeAudioWithWhisper } from "@/services/ai/stt/whisper-stt.service";
import { AppError } from "@/utils/errors";

type SttProvider = "gemini" | "whisper" | "local";

const VERCEL_LOCAL_STT_MESSAGE =
  "Local voice only works on your PC (npm run dev). On Vercel, add OPENAI_API_KEY in Project Settings → Environment Variables, then redeploy.";

function assertLocalSttAllowed(): void {
  if (env.isVercel()) {
    throw new AppError(VERCEL_LOCAL_STT_MESSAGE, {
      code: "STT_NOT_CONFIGURED",
      statusCode: 503,
    });
  }
}

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

  if (provider === "whisper") {
    try {
      return {
        text: await transcribeAudioWithWhisper(buffer, mimeType),
        provider: "whisper",
      };
    } catch (cloudError) {
      const allowGeminiFallback =
        process.env.STT_GEMINI_FALLBACK === "true" &&
        env.ai.geminiApiKey() &&
        cloudError instanceof AppError &&
        cloudError.code === "STT_QUOTA_EXCEEDED";
      if (allowGeminiFallback) {
        return {
          text: await transcribeAudioWithGemini(
            buffer.toString("base64"),
            mimeType,
          ),
          provider: "gemini",
        };
      }
      throw cloudError;
    }
  }

  assertLocalSttAllowed();

  try {
    const { transcribeAudioLocalWhisper } = await import(
      "@/services/ai/stt/local-whisper-stt.service"
    );
    return {
      text: await transcribeAudioLocalWhisper(buffer, mimeType),
      provider: "local",
    };
  } catch (localError) {
    const allowGeminiFallback =
      process.env.STT_GEMINI_FALLBACK === "true" && env.ai.geminiApiKey();
    if (!allowGeminiFallback) {
      if (localError instanceof AppError) throw localError;
      const message =
        localError instanceof Error ? localError.message : String(localError);
      throw new AppError(
        `Local voice recognition failed: ${message}. Add OPENAI_API_KEY for cloud Whisper (~$0.006/min), or type your question.`,
        { code: "STT_REQUEST_FAILED", statusCode: 502 },
      );
    }
    return {
      text: await transcribeAudioWithGemini(buffer.toString("base64"), mimeType),
      provider: "gemini",
    };
  }
}

export { transcribeWithFallback, type SttProvider };
