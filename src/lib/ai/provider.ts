import type { Message, Memory } from "@/types";

export interface AIProviderParams {
  systemPrompt: string;
  messages: Message[];
  memories: Memory[];
  fileContents?: { name: string; content: string }[];
}

export interface AIProvider {
  generateResponse(params: AIProviderParams): AsyncIterable<string>;
}
