import { env } from "@/lib/env";
import { AppError } from "@/utils/errors";
import { claudeClient } from "@/services/ai/advisor/claude-client";

import { logLlmCallFailure, logLlmCallSuccess } from "./llm-log-writer";
import type {
  AiProvider,
  AiProviderAvailability,
  LlmCompleteRequest,
  LlmCompleteResponse,
} from "./types";

export type {
  AiProvider,
  AiProviderAvailability,
  LlmCompleteRequest,
  LlmCompleteResponse,
};

/** The app only uses Claude for text generation. */
const TEXT_PROVIDER: AiProvider = "claude";

export function isProviderConfigured(provider: AiProvider): boolean {
  return provider === TEXT_PROVIDER && Boolean(env.ai.anthropicApiKey());
}

/**
 * Always Claude. A requested provider (old clients may still send `ai_provider`)
 * and the AI_PROVIDER env var are ignored.
 */
export function resolveProvider(requested?: AiProvider): AiProvider {
  void requested;
  return TEXT_PROVIDER;
}

export function getAiProviderAvailability(): AiProviderAvailability {
  const stt_cloud = env.ai.hasCloudStt();
  const stt_local =
    process.env.LOCAL_STT_ENABLED !== "false" && !env.isVercel();
  return {
    claude: isProviderConfigured(TEXT_PROVIDER),
    gemini: false,
    stt_cloud,
    stt_local,
    default: TEXT_PROVIDER,
  };
}

export async function llmComplete(
  request: LlmCompleteRequest,
): Promise<LlmCompleteResponse> {
  const provider = resolveProvider(request.provider);
  const startedAt = new Date();

  if (!isProviderConfigured(provider)) {
    const err = new AppError("ANTHROPIC_API_KEY is not configured", {
      code: "LLM_NOT_CONFIGURED",
      statusCode: 503,
    });
    await logLlmCallFailure(request, startedAt, provider, err, request.model);
    throw err;
  }

  try {
    const result = await claudeClient.complete({
      system: request.system,
      user: request.user,
      model: request.model,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
    });

    const response: LlmCompleteResponse = {
      text: result.text,
      model: result.model,
      provider: "claude",
      usage: result.usage,
    };

    await logLlmCallSuccess(request, response, startedAt, provider);
    return response;
  } catch (error) {
    await logLlmCallFailure(
      request,
      startedAt,
      provider,
      error,
      request.model,
    );
    throw error;
  }
}
