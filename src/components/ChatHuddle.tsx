"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Team, Huddle, Message } from "@/types";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { AIPresenceToggle } from "./AIPresenceToggle";
import { AIRaisedHand } from "./AIRaisedHand";
import { AboutModal } from "./AboutModal";

interface ChatHuddleProps {
  huddle: Huddle;
  team: Team;
  onOpenThread: (messageId: string) => void;
  onToggleMemory: () => void;
  onToggleFiles: () => void;
  onMenuClick: () => void;
}

const EVAL_PAUSE_MS = 15_000;
const EVAL_MIN_MESSAGES = 3;
const MEMORY_PAUSE_MS = 120_000;
const MEMORY_MIN_MESSAGES = 5;

export function ChatHuddle({
  huddle,
  team,
  onOpenThread,
  onToggleMemory,
  onToggleFiles,
  onMenuClick,
}: ChatHuddleProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [raisedHand, setRaisedHand] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const evalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEvalCountRef = useRef(0);
  const lastMemoryCountRef = useRef(0);

  useEffect(() => {
    const q = query(
      collection(db, "teams", team.id, "huddles", huddle.id, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as Message))
        .filter((m) => !m.threadId);
      setMessages(msgs);
    });

    return unsub;
  }, [team.id, huddle.id]);

  // Active mode: evaluate after a pause in conversation
  useEffect(() => {
    if (huddle.aiPresence !== "active") {
      if (evalTimerRef.current) clearTimeout(evalTimerRef.current);
      return;
    }

    const humanMessagesSinceLastAI = (() => {
      let count = 0;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].isAI) break;
        count++;
      }
      return count;
    })();

    if (humanMessagesSinceLastAI < EVAL_MIN_MESSAGES) return;
    if (humanMessagesSinceLastAI === lastEvalCountRef.current) return;

    if (evalTimerRef.current) clearTimeout(evalTimerRef.current);

    evalTimerRef.current = setTimeout(() => {
      lastEvalCountRef.current = humanMessagesSinceLastAI;
      runEvaluation();
    }, EVAL_PAUSE_MS);

    return () => {
      if (evalTimerRef.current) clearTimeout(evalTimerRef.current);
    };
  }, [messages, huddle.aiPresence]);

  // Memory extraction: runs after a quiet period, regardless of AI presence mode
  useEffect(() => {
    if (messages.length < MEMORY_MIN_MESSAGES) return;
    if (messages.length === lastMemoryCountRef.current) return;

    if (memoryTimerRef.current) clearTimeout(memoryTimerRef.current);

    memoryTimerRef.current = setTimeout(() => {
      lastMemoryCountRef.current = messages.length;
      fetch("/api/ai/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id, huddleId: huddle.id }),
      }).catch((err) => console.error("Memory extraction error:", err));
    }, MEMORY_PAUSE_MS);

    return () => {
      if (memoryTimerRef.current) clearTimeout(memoryTimerRef.current);
    };
  }, [messages.length, team.id, huddle.id]);

  const runEvaluation = useCallback(async () => {
    if (aiStreaming) return;

    try {
      const res = await fetch("/api/ai/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: team.id,
          huddleId: huddle.id,
        }),
      });

      const data = await res.json();

      if (data.decision === "RAISE_HAND" && data.teaser) {
        setRaisedHand(data.teaser);
      } else if (data.decision === "SPEAK" && data.message) {
        await addDoc(
          collection(db, "teams", team.id, "huddles", huddle.id, "messages"),
          {
            huddleId: huddle.id,
            author: "ai",
            authorName: "Huddle AI",
            text: data.message,
            isAI: true,
            threadId: null,
            attachments: [],
            createdAt: Date.now(),
          }
        );
      }
    } catch (err) {
      console.error("AI evaluation error:", err);
    }
  }, [team.id, huddle.id, aiStreaming]);

  const handleExpandRaisedHand = async () => {
    setRaisedHand(null);
    setAiStreaming(true);
    try {
      const res = await fetch("/api/ai/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: team.id,
          huddleId: huddle.id,
          threadId: null,
          aiPresence: "active",
        }),
      });

      if (!res.ok || !res.body) throw new Error("AI response failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        fullText += chunk;
        setStreamingText((prev) => prev + chunk);
      }

      if (fullText.trim()) {
        await addDoc(
          collection(db, "teams", team.id, "huddles", huddle.id, "messages"),
          {
            huddleId: huddle.id,
            author: "ai",
            authorName: "Huddle AI",
            text: fullText.trim(),
            isAI: true,
            threadId: null,
            attachments: [],
            createdAt: Date.now(),
          }
        );
      }
    } catch (err) {
      console.error("AI response error:", err);
    } finally {
      setAiStreaming(false);
      setStreamingText("");
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Reset raised hand when switching huddles
  useEffect(() => {
    setRaisedHand(null);
    lastEvalCountRef.current = 0;
    lastMemoryCountRef.current = 0;
  }, [huddle.id]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Huddle header */}
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
          # {huddle.name}
        </h1>

        <div className="flex-1" />

        <AIPresenceToggle huddle={huddle} teamId={team.id} />

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

        {/* Brand mark */}
        <button
          onClick={() => setAboutOpen(true)}
          className="ml-2 hidden items-center gap-1.5 border-l border-gray-200 pl-3 transition-opacity hover:opacity-70 sm:flex"
          title="About ShodoHuddle"
        >
          <img src="/logo.png" alt="" className="h-5 w-5" />
          <img src="/logo-text.png" alt="shodohuddle" className="h-3 w-auto opacity-40" />
        </button>
      </div>

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />

      {/* Messages */}
      <MessageList
        messages={messages}
        onOpenThread={onOpenThread}
        aiStreaming={aiStreaming}
        streamingText={streamingText}
      />

      {/* AI raised hand */}
      {raisedHand && (
        <AIRaisedHand
          teaser={raisedHand}
          onExpand={handleExpandRaisedHand}
          onDismiss={() => setRaisedHand(null)}
        />
      )}

      <div ref={messagesEndRef} />

      {/* Input */}
      <MessageInput
        huddle={huddle}
        team={team}
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
