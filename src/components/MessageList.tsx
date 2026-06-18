"use client";

import { useState } from "react";
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Message } from "@/types";
import { Markdown } from "./Markdown";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "👀", "🙏"];

interface MessageListProps {
  messages: Message[];
  onOpenThread: (messageId: string) => void;
  aiStreaming: boolean;
  streamingText: string;
  teamId: string;
  huddleId: string;
  currentUserId?: string;
}

export function MessageList({
  messages,
  onOpenThread,
  aiStreaming,
  streamingText,
  teamId,
  huddleId,
  currentUserId,
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
          teamId={teamId}
          huddleId={huddleId}
          currentUserId={currentUserId}
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
              <Markdown>{streamingText}</Markdown>
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
  teamId,
  huddleId,
  currentUserId,
}: {
  message: Message;
  onOpenThread: () => void;
  teamId: string;
  huddleId: string;
  currentUserId?: string;
}) {
  const isAI = message.isAI;
  const isOwn = !isAI && message.author === currentUserId;

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [copied, setCopied] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const messageRef = doc(
    db,
    "teams",
    teamId,
    "huddles",
    huddleId,
    "messages",
    message.id
  );

  const reactionEntries = Object.entries(message.reactions || {}).filter(
    ([, uids]) => uids.length > 0
  );

  const toggleReaction = async (emoji: string) => {
    if (!currentUserId) return;
    const alreadyReacted = message.reactions?.[emoji]?.includes(currentUserId);
    await updateDoc(messageRef, {
      [`reactions.${emoji}`]: alreadyReacted
        ? arrayRemove(currentUserId)
        : arrayUnion(currentUserId),
    });
    setShowReactionPicker(false);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const saveEdit = async () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== message.text) {
      await updateDoc(messageRef, { text: trimmed, editedAt: Date.now() });
    }
    setEditing(false);
  };

  const remove = async () => {
    if (window.confirm("Delete this message?")) {
      await deleteDoc(messageRef);
    }
  };

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

      <div className={`max-w-[80%] ${editing ? "w-full" : ""}`}>
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
          {message.editedAt && (
            <span className="ml-1.5 font-normal text-gray-300">(edited)</span>
          )}
        </p>

        <div
          className={`rounded-2xl px-4 py-2.5 text-sm ${
            isAI
              ? "rounded-tl-sm bg-indigo-50 text-gray-800 ring-1 ring-indigo-100"
              : "rounded-tl-sm bg-white text-gray-800 shadow-sm ring-1 ring-gray-100"
          }`}
        >
          {editing ? (
            <div>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    saveEdit();
                  } else if (e.key === "Escape") {
                    setEditText(message.text);
                    setEditing(false);
                  }
                }}
                className="w-full resize-none rounded-md border border-indigo-300 bg-white px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                rows={2}
                autoFocus
              />
              <div className="mt-1 flex gap-2 text-xs">
                <button
                  onClick={saveEdit}
                  className="font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditText(message.text);
                    setEditing(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
                <span className="text-gray-300">Enter to save · Esc to cancel</span>
              </div>
            </div>
          ) : isAI ? (
            <Markdown>{message.text}</Markdown>
          ) : (
            <p className="whitespace-pre-wrap">{message.text}</p>
          )}

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

        {/* Reaction pills (always visible) */}
        {reactionEntries.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {reactionEntries.map(([emoji, uids]) => {
              const mine = !!currentUserId && uids.includes(currentUserId);
              return (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                    mine
                      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                  title={`${uids.length} reaction${uids.length === 1 ? "" : "s"}`}
                >
                  <span>{emoji}</span>
                  <span>{uids.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Action row */}
        {!editing && (
          <div className="relative mt-1 flex items-center gap-3 text-xs text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => setShowReactionPicker((v) => !v)}
              className="hover:text-indigo-500"
            >
              React
            </button>
            <button onClick={onOpenThread} className="hover:text-indigo-500">
              Reply in thread
            </button>
            <button onClick={copy} className="hover:text-indigo-500">
              {copied ? "Copied!" : "Copy"}
            </button>
            {isOwn && (
              <>
                <button
                  onClick={() => {
                    setEditText(message.text);
                    setEditing(true);
                  }}
                  className="hover:text-indigo-500"
                >
                  Edit
                </button>
                <button onClick={remove} className="hover:text-red-500">
                  Delete
                </button>
              </>
            )}

            {showReactionPicker && (
              <div className="absolute bottom-full left-0 z-10 mb-1 flex gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 shadow-md">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => toggleReaction(emoji)}
                    className="rounded-full px-1 text-base leading-none transition-transform hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
