import type { StoredConversation } from "@/types/financial-state";
import { AppError } from "@/utils/errors";

/**
 * Financial State Engine — persistence for conversation transcripts (storage only).
 * AI Explanation Layer reads/writes through this service; LLM does not touch Prisma directly.
 */
export class ConversationStoreService {
  async load(_conversationId: string): Promise<StoredConversation> {
    throw new AppError("Conversation load not implemented", {
      code: "NOT_IMPLEMENTED",
      statusCode: 501,
    });
  }

  async appendMessage(
    _conversationId: string,
    _message: StoredConversation["messages"][number],
  ): Promise<void> {
    throw new AppError("Conversation append not implemented", {
      code: "NOT_IMPLEMENTED",
      statusCode: 501,
    });
  }
}

export const conversationStoreService = new ConversationStoreService();
