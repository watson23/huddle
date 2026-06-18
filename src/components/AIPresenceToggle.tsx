"use client";

import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Huddle, AIPresence } from "@/types";

interface AIPresenceToggleProps {
  huddle: Huddle;
  teamId: string;
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

const descriptions: { key: AIPresence; label: string; desc: string }[] = [
  { key: "off", label: "Off", desc: "The AI stays out of this huddle entirely." },
  {
    key: "on-demand",
    label: "On-demand",
    desc: "The AI only replies when you tap Ask AI or mention @ai.",
  },
  {
    key: "active",
    label: "Active",
    desc: "The AI follows along and chimes in on its own when it can help.",
  },
];

export function AIPresenceToggle({ huddle, teamId }: AIPresenceToggleProps) {
  const toggle = async () => {
    const next = nextState[huddle.aiPresence];
    await updateDoc(doc(db, "teams", teamId, "huddles", huddle.id), {
      aiPresence: next,
    });
  };

  return (
    <div className="group relative">
      <button
        onClick={toggle}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${colors[huddle.aiPresence]}`}
      >
        {labels[huddle.aiPresence]}
      </button>

      {/* Explainer popover — helps first-time users understand the 3 modes. */}
      <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-3 text-left opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">
          AI presence · tap to cycle
        </p>
        <div className="space-y-2">
          {descriptions.map((d) => (
            <div key={d.key} className="flex gap-2">
              <span
                className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                  huddle.aiPresence === d.key ? "bg-indigo-500" : "bg-gray-200"
                }`}
              />
              <div>
                <p
                  className={`text-xs font-semibold ${
                    huddle.aiPresence === d.key
                      ? "text-indigo-600"
                      : "text-gray-700"
                  }`}
                >
                  {d.label}
                </p>
                <p className="text-[11px] leading-snug text-gray-500">{d.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
