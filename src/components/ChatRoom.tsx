"use client";

import { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Org, Room, Message } from "@/types";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { AIPresenceToggle } from "./AIPresenceToggle";

interface ChatRoomProps {
  room: Room;
  org: Org;
  onOpenThread: (messageId: string) => void;
  onToggleMemory: () => void;
  onToggleFiles: () => void;
  onMenuClick: () => void;
}

export function ChatRoom({
  room,
  org,
  onOpenThread,
  onToggleMemory,
  onToggleFiles,
  onMenuClick,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen to top-level messages only (not thread replies)
    const q = query(
      collection(db, "orgs", org.id, "rooms", room.id, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as Message))
        .filter((m) => !m.threadId);
      setMessages(msgs);
    });

    return unsub;
  }, [org.id, room.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Room header */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <button
          onClick={onMenuClick}
          className="rounded p-1 hover:bg-gray-100 md:hidden"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h1 className="text-lg font-semibold text-gray-900">
          # {room.name}
        </h1>

        <div className="flex-1" />

        <AIPresenceToggle room={room} orgId={org.id} />

        <button
          onClick={onToggleMemory}
          className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="Memory"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </button>

        <button
          onClick={onToggleFiles}
          className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="Files"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        onOpenThread={onOpenThread}
        aiStreaming={aiStreaming}
        streamingText={streamingText}
      />
      <div ref={messagesEndRef} />

      {/* Input */}
      <MessageInput
        room={room}
        org={org}
        onAIStreamStart={() => setAiStreaming(true)}
        onAIStreamText={(text) => setStreamingText((prev) => prev + text)}
        onAIStreamEnd={() => {
          setAiStreaming(false);
          setStreamingText("");
        }}
      />
    </div>
  );
}
