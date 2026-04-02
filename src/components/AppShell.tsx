"use client";

import { useState } from "react";
import type { Org, Room } from "@/types";
import { Sidebar } from "./Sidebar";
import { ChatRoom } from "./ChatRoom";
import { RightPanel } from "./RightPanel";

interface AppShellProps {
  org: Org;
}

export function AppShell({ org }: AppShellProps) {
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [rightPanel, setRightPanel] = useState<
    "closed" | "thread" | "memory" | "files"
  >("closed");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openThread = (messageId: string) => {
    setActiveThreadId(messageId);
    setRightPanel("thread");
  };

  return (
    <div className="flex h-full">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          org={org}
          activeRoom={activeRoom}
          onSelectRoom={(room) => {
            setActiveRoom(room);
            setSidebarOpen(false);
          }}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeRoom ? (
          <ChatRoom
            room={activeRoom}
            org={org}
            onOpenThread={openThread}
            onToggleMemory={() =>
              setRightPanel((p) => (p === "memory" ? "closed" : "memory"))
            }
            onToggleFiles={() =>
              setRightPanel((p) => (p === "files" ? "closed" : "files"))
            }
            onMenuClick={() => setSidebarOpen(true)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            <div className="text-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="mb-4 rounded-lg bg-gray-100 px-4 py-2 text-sm md:hidden"
              >
                Open rooms
              </button>
              <p className="text-lg">Select a room to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Right panel */}
      {rightPanel !== "closed" && activeRoom && (
        <RightPanel
          type={rightPanel}
          room={activeRoom}
          org={org}
          threadId={activeThreadId}
          onClose={() => setRightPanel("closed")}
        />
      )}
    </div>
  );
}
