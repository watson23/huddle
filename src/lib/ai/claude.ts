import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, AIProviderParams } from "./provider";

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async *generateResponse(params: AIProviderParams): AsyncIterable<string> {
    const systemParts = [params.systemPrompt];

    if (params.memories.length > 0) {
      systemParts.push(
        "\n\nRelevant memories from previous conversations:\n" +
          params.memories.map((m) => `- ${m.key}: ${m.value}`).join("\n")
      );
    }

    if (params.fileContents && params.fileContents.length > 0) {
      systemParts.push(
        "\n\nReferenced files:\n" +
          params.fileContents
            .map((f) => `--- ${f.name} ---\n${f.content}`)
            .join("\n\n")
      );
    }

    const conversationMessages = params.messages.map((msg) => ({
      role: (msg.isAI ? "assistant" : "user") as "user" | "assistant",
      content: msg.isAI ? msg.text : `${msg.authorName}: ${msg.text}`,
    }));

    // Ensure conversation starts with a user message
    if (
      conversationMessages.length === 0 ||
      conversationMessages[0].role !== "user"
    ) {
      conversationMessages.unshift({
        role: "user",
        content: "(conversation context)",
      });
    }

    // Merge consecutive same-role messages
    const mergedMessages: { role: "user" | "assistant"; content: string }[] = [];
    for (const msg of conversationMessages) {
      if (
        mergedMessages.length > 0 &&
        mergedMessages[mergedMessages.length - 1].role === msg.role
      ) {
        mergedMessages[mergedMessages.length - 1].content += "\n" + msg.content;
      } else {
        mergedMessages.push({ ...msg });
      }
    }

    // Ensure last message is from user (the trigger for AI to respond)
    if (
      mergedMessages.length === 0 ||
      mergedMessages[mergedMessages.length - 1].role !== "user"
    ) {
      mergedMessages.push({
        role: "user",
        content: "(please respond to the conversation above)",
      });
    }

    const stream = this.client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemParts.join(""),
      messages: mergedMessages,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  }
}
