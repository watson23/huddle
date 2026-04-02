"use client";

import { useState, useRef } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Org, Room } from "@/types";

interface MessageInputProps {
  room: Room;
  org: Org;
  threadId?: string;
  onAIStreamStart?: () => void;
  onAIStreamText?: (text: string) => void;
  onAIStreamEnd?: () => void;
}

export function MessageInput({
  room,
  org,
  threadId,
  onAIStreamStart,
  onAIStreamText,
  onAIStreamEnd,
}: MessageInputProps) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sendMessage = async () => {
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
        collection(db, "orgs", org.id, "rooms", room.id, "messages"),
        {
          roomId: room.id,
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

      // Check if AI should respond
      const shouldTriggerAI =
        room.aiPresence !== "off" &&
        (messageText.toLowerCase().includes("@ai") ||
          room.aiPresence === "active");

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
          orgId: org.id,
          roomId: room.id,
          threadId: threadId || null,
          aiPresence: room.aiPresence,
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
          collection(db, "orgs", org.id, "rooms", room.id, "messages"),
          {
            roomId: room.id,
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
            room.aiPresence === "on-demand"
              ? "Type a message... (use @ai to ask the AI)"
              : "Type a message..."
          }
          className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
          rows={1}
          disabled={sending}
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim() || sending}
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
