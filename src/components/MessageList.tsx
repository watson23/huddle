"use client";

import type { Message } from "@/types";

interface MessageListProps {
  messages: Message[];
  onOpenThread: (messageId: string) => void;
  aiStreaming: boolean;
  streamingText: string;
}

export function MessageList({
  messages,
  onOpenThread,
  aiStreaming,
  streamingText,
}: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center text-gray-400">
          <p>No messages yet. Start the conversation!</p>
        </div>
      )}

      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          onOpenThread={() => onOpenThread(msg.id)}
        />
      ))}

      {aiStreaming && streamingText && (
        <div className="mb-4 flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-600">
            AI
          </div>
          <div className="max-w-[80%]">
            <p className="mb-1 text-xs font-medium text-indigo-600">
              Huddle AI
            </p>
            <div className="rounded-2xl rounded-tl-sm bg-indigo-50 px-4 py-2.5 text-sm text-gray-800 ring-1 ring-indigo-100">
              {streamingText}
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-indigo-400" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  onOpenThread,
}: {
  message: Message;
  onOpenThread: () => void;
}) {
  const isAI = message.isAI;

  return (
    <div className="group mb-4 flex gap-3">
      {/* Avatar */}
      {isAI ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-600">
          AI
        </div>
      ) : message.authorPhoto ? (
        <img
          src={message.authorPhoto}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
          {message.authorName?.[0]?.toUpperCase() || "?"}
        </div>
      )}

      <div className="max-w-[80%]">
        <p
          className={`mb-1 text-xs font-medium ${
            isAI ? "text-indigo-600" : "text-gray-500"
          }`}
        >
          {isAI ? "Huddle AI" : message.authorName}
          <span className="ml-2 font-normal text-gray-400">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </p>

        <div
          className={`rounded-2xl px-4 py-2.5 text-sm ${
            isAI
              ? "rounded-tl-sm bg-indigo-50 text-gray-800 ring-1 ring-indigo-100"
              : "rounded-tl-sm bg-white text-gray-800 shadow-sm ring-1 ring-gray-100"
          }`}
        >
          <p className="whitespace-pre-wrap">{message.text}</p>

          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  {att.name}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Thread button */}
        <button
          onClick={onOpenThread}
          className="mt-1 text-xs text-gray-400 opacity-0 transition-opacity hover:text-indigo-500 group-hover:opacity-100"
        >
          Reply in thread
        </button>
      </div>
    </div>
  );
}
