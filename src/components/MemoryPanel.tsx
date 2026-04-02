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
import type { Org, Room, Memory } from "@/types";

interface MemoryPanelProps {
  room: Room;
  org: Org;
}

export function MemoryPanel({ room, org }: MemoryPanelProps) {
  const [roomMemories, setRoomMemories] = useState<Memory[]>([]);
  const [orgMemories, setOrgMemories] = useState<Memory[]>([]);
  const [tab, setTab] = useState<"room" | "org">("room");

  useEffect(() => {
    const roomQ = query(
      collection(db, "orgs", org.id, "rooms", room.id, "memory"),
      orderBy("createdAt", "desc")
    );
    const unsub1 = onSnapshot(roomQ, (snap) => {
      setRoomMemories(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Memory))
      );
    });

    const orgQ = query(
      collection(db, "orgs", org.id, "memory"),
      orderBy("createdAt", "desc")
    );
    const unsub2 = onSnapshot(orgQ, (snap) => {
      setOrgMemories(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Memory))
      );
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [org.id, room.id]);

  const deleteMemory = async (memId: string) => {
    if (tab === "room") {
      await deleteDoc(
        doc(db, "orgs", org.id, "rooms", room.id, "memory", memId)
      );
    } else {
      await deleteDoc(doc(db, "orgs", org.id, "memory", memId));
    }
  };

  const memories = tab === "room" ? roomMemories : orgMemories;

  return (
    <div className="flex h-full flex-col">
      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setTab("room")}
          className={`flex-1 py-2 text-center text-xs font-medium ${
            tab === "room"
              ? "border-b-2 border-indigo-500 text-indigo-600"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Room ({roomMemories.length})
        </button>
        <button
          onClick={() => setTab("org")}
          className={`flex-1 py-2 text-center text-xs font-medium ${
            tab === "org"
              ? "border-b-2 border-indigo-500 text-indigo-600"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Organization ({orgMemories.length})
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
