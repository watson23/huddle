"use client";

import { useState, useRef } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Team, Huddle } from "@/types";

interface MessageInputProps {
  huddle: Huddle;
  team: Team;
  threadId?: string;
  onAIStreamStart?: () => void;
  onAIStreamText?: (text: string) => void;
  onAIStreamEnd?: () => void;
}

export function MessageInput({
  huddle,
  team,
  threadId,
  onAIStreamStart,
  onAIStreamText,
  onAIStreamEnd,
}: MessageInputProps) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const aiEnabled = huddle.aiPresence !== "off";

  // Match @ai only as a standalone mention, not inside words like email@ai.com.
  const mentionsAI = (msg: string) => /(^|\s)@ai\b/i.test(msg);

  const sendMessage = async (forceAI = false) => {
    if (!text.trim() || !user || sending) return;

    const messageText = text.trim();
    setText("");
    setSending(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      // Save the user message
      await addDoc(
        collection(db, "teams", team.id, "huddles", huddle.id, "messages"),
        {
          huddleId: huddle.id,
          author: user.uid,
          authorName: user.displayName || "Anonymous",
          authorPhoto: user.photoURL || null,
          text: messageText,
          isAI: false,
          threadId: threadId || null,
          attachments: [],
          createdAt: Date.now(),
        }
      );

      // Trigger the AI when the user explicitly asks for it — via the "Ask AI"
      // button (forceAI) or an @ai mention. Active mode's proactive replies are
      // handled separately by ChatHuddle's evaluation system.
      const shouldTriggerAI =
        aiEnabled && (forceAI || mentionsAI(messageText));

      if (shouldTriggerAI) {
        await triggerAIResponse(messageText);
      }
    } finally {
      setSending(false);
    }
  };

  const triggerAIResponse = async (latestMessage: string) => {
    onAIStreamStart?.();

    try {
      const res = await fetch("/api/ai/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: team.id,
          huddleId: huddle.id,
          threadId: threadId || null,
          aiPresence: huddle.aiPresence,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("AI response failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        fullText += chunk;
        onAIStreamText?.(chunk);
      }

      // Save the completed AI message
      if (fullText.trim()) {
        await addDoc(
          collection(db, "teams", team.id, "huddles", huddle.id, "messages"),
          {
            huddleId: huddle.id,
            author: "ai",
            authorName: "Huddle AI",
            text: fullText.trim(),
            isAI: true,
            threadId: threadId || null,
            attachments: [],
            createdAt: Date.now(),
          }
        );
      }
    } catch (err) {
      console.error("AI response error:", err);
    } finally {
      onAIStreamEnd?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const canSend = !!text.trim() && !sending;

  const handleInput = () => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 150) + "px";
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={
            aiEnabled
              ? "Type a message... (or tap Ask AI)"
              : "Type a message..."
          }
          className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
          rows={1}
          disabled={sending}
        />
        {aiEnabled && (
          <button
            onClick={() => sendMessage(true)}
            disabled={!canSend}
            title="Send and ask the AI to respond"
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-100 disabled:opacity-40"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Ask AI
          </button>
        )}
        <button
          onClick={() => sendMessage()}
          disabled={!canSend}
          title="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white transition-colors hover:bg-indigo-600 disabled:opacity-40"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
