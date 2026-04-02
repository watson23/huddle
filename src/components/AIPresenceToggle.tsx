"use client";

import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Room, AIPresence } from "@/types";

interface AIPresenceToggleProps {
  room: Room;
  orgId: string;
}

const labels: Record<AIPresence, string> = {
  off: "AI Off",
  "on-demand": "AI On-demand",
  active: "AI Active",
};

const colors: Record<AIPresence, string> = {
  off: "bg-gray-100 text-gray-500",
  "on-demand": "bg-indigo-50 text-indigo-600",
  active: "bg-green-50 text-green-600",
};

const nextState: Record<AIPresence, AIPresence> = {
  off: "on-demand",
  "on-demand": "active",
  active: "off",
};

export function AIPresenceToggle({ room, orgId }: AIPresenceToggleProps) {
  const toggle = async () => {
    const next = nextState[room.aiPresence];
    await updateDoc(doc(db, "orgs", orgId, "rooms", room.id), {
      aiPresence: next,
    });
  };

  return (
    <button
      onClick={toggle}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${colors[room.aiPresence]}`}
      title={`Click to cycle: Off → On-demand → Active`}
    >
      {labels[room.aiPresence]}
    </button>
  );
}
