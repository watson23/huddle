"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Team, Huddle, Memory } from "@/types";

interface MemoryPanelProps {
  huddle: Huddle;
  team: Team;
}

export function MemoryPanel({ huddle, team }: MemoryPanelProps) {
  const [huddleMemories, setHuddleMemories] = useState<Memory[]>([]);
  const [teamMemories, setTeamMemories] = useState<Memory[]>([]);
  const [tab, setTab] = useState<"huddle" | "team">("huddle");

  useEffect(() => {
    const huddleQ = query(
      collection(db, "teams", team.id, "huddles", huddle.id, "memory"),
      orderBy("createdAt", "desc")
    );
    const unsub1 = onSnapshot(huddleQ, (snap) => {
      setHuddleMemories(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Memory))
      );
    });

    const teamQ = query(
      collection(db, "teams", team.id, "memory"),
      orderBy("createdAt", "desc")
    );
    const unsub2 = onSnapshot(teamQ, (snap) => {
      setTeamMemories(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Memory))
      );
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [team.id, huddle.id]);

  const deleteMemory = async (memId: string) => {
    if (tab === "huddle") {
      await deleteDoc(
        doc(db, "teams", team.id, "huddles", huddle.id, "memory", memId)
      );
    } else {
      await deleteDoc(doc(db, "teams", team.id, "memory", memId));
    }
  };

  const memories = tab === "huddle" ? huddleMemories : teamMemories;

  return (
    <div className="flex h-full flex-col">
      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setTab("huddle")}
          className={`flex-1 py-2 text-center text-xs font-medium ${
            tab === "huddle"
              ? "border-b-2 border-indigo-500 text-indigo-600"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Huddle ({huddleMemories.length})
        </button>
        <button
          onClick={() => setTab("team")}
          className={`flex-1 py-2 text-center text-xs font-medium ${
            tab === "team"
              ? "border-b-2 border-indigo-500 text-indigo-600"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Team ({teamMemories.length})
        </button>
      </div>

      {/* Memory list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {memories.length === 0 ? (
          <p className="text-center text-xs text-gray-400">
            No memories yet. The AI will build knowledge as conversations
            happen.
          </p>
        ) : (
          memories.map((mem) => (
            <div
              key={mem.id}
              className="group mb-3 rounded-lg bg-gray-50 p-3"
            >
              <div className="flex items-start justify-between">
                <p className="text-xs font-medium text-gray-700">{mem.key}</p>
                <button
                  onClick={() => deleteMemory(mem.id)}
                  className="ml-2 rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">{mem.value}</p>
              <p className="mt-1 text-[10px] text-gray-300">
                {new Date(mem.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
