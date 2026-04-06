"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Team, Huddle } from "@/types";
import { Sidebar } from "./Sidebar";
import { ChatHuddle } from "./ChatHuddle";
import { RightPanel } from "./RightPanel";

interface AppShellProps {
  team: Team;
}

export function AppShell({ team }: AppShellProps) {
  const [activeHuddleId, setActiveHuddleId] = useState<string | null>(null);
  const [activeHuddle, setActiveHuddle] = useState<Huddle | null>(null);
  const [rightPanel, setRightPanel] = useState<
    "closed" | "thread" | "memory" | "files"
  >("closed");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Subscribe to active huddle changes (so AI presence toggle updates in real-time)
  useEffect(() => {
    if (!activeHuddleId) {
      setActiveHuddle(null);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "teams", team.id, "huddles", activeHuddleId),
      (snap) => {
        if (snap.exists()) {
          setActiveHuddle({ id: snap.id, ...snap.data() } as Huddle);
        }
      }
    );
    return unsub;
  }, [team.id, activeHuddleId]);

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
          team={team}
          activeHuddle={activeHuddle}
          onSelectHuddle={(huddle) => {
            setActiveHuddleId(huddle.id);
            setSidebarOpen(false);
          }}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeHuddle ? (
          <ChatHuddle
            huddle={activeHuddle}
            team={team}
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
                Open huddles
              </button>
              <p className="text-lg">Select a huddle to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Right panel */}
      {rightPanel !== "closed" && activeHuddle && (
        <RightPanel
          type={rightPanel}
          huddle={activeHuddle}
          team={team}
          threadId={activeThreadId}
          onClose={() => setRightPanel("closed")}
        />
      )}
    </div>
  );
}
