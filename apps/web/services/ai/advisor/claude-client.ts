import { env } from "@/lib/env";
import { AppError } from "@/utils/errors";

export interface ClaudeMessageRequest {
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
}

export interface ClaudeMessageResponse {
  text: string;
  model: string;
  provider: "anthropic";
}

/**
 * Claude API abstraction — Messages API only; no financial logic.
 */
export class ClaudeClient {
  private readonly apiUrl = "https://api.anthropic.com/v1/messages";
  private readonly apiVersion = "2023-06-01";
  private readonly defaultModel =
    process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

  async complete(request: ClaudeMessageRequest): Promise<ClaudeMessageResponse> {
    const apiKey = env.ai.anthropicApiKey();
    if (!apiKey) {
      throw new AppError("ANTHROPIC_API_KEY is not configured", {
        code: "LLM_NOT_CONFIGURED",
        statusCode: 503,
      });
    }

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": this.apiVersion,
      },
      body: JSON.stringify({
        model: request.model ?? this.defaultModel,
        max_tokens: request.maxTokens ?? 2048,
        system: request.system,
        messages: [{ role: "user", content: request.user }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new AppError(`Claude API error: ${response.status} ${body}`, {
        code: "LLM_REQUEST_FAILED",
        statusCode: 502,
      });
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      model?: string;
    };

    const text = data.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("")
      .trim();

    if (!text) {
      throw new AppError("Claude API returned empty content", {
        code: "LLM_EMPTY_RESPONSE",
        statusCode: 502,
      });
    }

    return {
      text,
      model: data.model ?? request.model ?? this.defaultModel,
      provider: "anthropic",
    };
  }
}

export const claudeClient = new ClaudeClient();
