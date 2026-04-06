"use client";

import type { Team, Huddle } from "@/types";
import { ThreadPanel } from "./ThreadPanel";
import { MemoryPanel } from "./MemoryPanel";
import { FilesPanel } from "./FilesPanel";

interface RightPanelProps {
  type: "thread" | "memory" | "files";
  huddle: Huddle;
  team: Team;
  threadId: string | null;
  onClose: () => void;
}

export function RightPanel({
  type,
  huddle,
  team,
  threadId,
  onClose,
}: RightPanelProps) {
  return (
    <div className="flex w-80 flex-col border-l border-gray-200 bg-white max-md:fixed max-md:inset-0 max-md:z-40 max-md:w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">
          {type === "thread" && "Thread"}
          {type === "memory" && "Memory"}
          {type === "files" && "Files"}
        </h3>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {type === "thread" && threadId && (
          <ThreadPanel huddle={huddle} team={team} threadId={threadId} />
        )}
        {type === "memory" && <MemoryPanel huddle={huddle} team={team} />}
        {type === "files" && <FilesPanel huddle={huddle} team={team} />}
      </div>
    </div>
  );
}
