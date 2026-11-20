import { env } from "@/lib/env";
import { transcribeAudioWithWhisper } from "@/services/ai/stt/whisper-stt.service";
import { AppError } from "@/utils/errors";

type SttProvider = "whisper" | "local";

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
  if (provider === "whisper") {
    return {
      text: await transcribeAudioWithWhisper(buffer, mimeType),
      provider: "whisper",
    };
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
    if (localError instanceof AppError) throw localError;
    const message =
      localError instanceof Error ? localError.message : String(localError);
    throw new AppError(
      `Local voice recognition failed: ${message}. Add OPENAI_API_KEY for cloud Whisper (~$0.006/min), or type your question.`,
      { code: "STT_REQUEST_FAILED", statusCode: 502 },
    );
  }
}

export { transcribeWithFallback, type SttProvider };
