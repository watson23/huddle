"use client";

import { useEffect, useRef } from "react";

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

export function AboutModal({ open, onClose }: AboutModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-10 w-10" />
          <div>
            <img src="/logo-text.png" alt="shodohuddle" className="h-4 w-auto" />
            <p className="mt-0.5 text-xs text-gray-400">Group conversations with AI</p>
          </div>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-sm text-gray-600">
          <div>
            <h3 className="mb-1 font-semibold text-gray-900">What is ShodoHuddle?</h3>
            <p>
              A team chatroom where AI is a participant, not just a tool. Your team discusses topics together,
              and the AI listens, learns, and contributes when it has something valuable to add.
            </p>
          </div>

          <div>
            <h3 className="mb-1 font-semibold text-gray-900">AI participation levels</h3>
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Off</span>
                <span>AI stays completely silent. Memory still builds.</span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">On-demand</span>
                <span>AI responds only when you tag it with <code className="rounded bg-gray-100 px-1 text-xs">@ai</code></span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-600">Active</span>
                <span>AI decides when to contribute. It may raise its hand or speak up when it has something useful.</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-1 font-semibold text-gray-900">Memory</h3>
            <p>
              The AI continuously builds knowledge from your conversations — key decisions, context, and facts —
              regardless of its participation level. This memory persists across conversations and is shared
              with the team. View and manage it via the lightbulb icon.
            </p>
          </div>

          <div>
            <h3 className="mb-1 font-semibold text-gray-900">Threads</h3>
            <p>
              Click "Reply in thread" on any message to start a side conversation without cluttering the main chat.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 border-t border-gray-100 pt-4">
          <p className="text-center text-xs text-gray-400">
            Part of the Shodo product family
          </p>
        </div>
      </div>
    </div>
  );
}
