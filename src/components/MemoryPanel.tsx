"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Markdown } from "./Markdown";
import {
  MEMORY_CATEGORIES,
  type Team,
  type Huddle,
  type Memory,
} from "@/types";

interface MemoryPanelProps {
  huddle: Huddle;
  team: Team;
}

export function MemoryPanel({ huddle, team }: MemoryPanelProps) {
  const { user } = useAuth();
  const [huddleMemories, setHuddleMemories] = useState<Memory[]>([]);
  const [teamMemories, setTeamMemories] = useState<Memory[]>([]);
  const [tab, setTab] = useState<"huddle" | "team">("huddle");
  const [summary, setSummary] = useState<{ text: string; updatedAt: number } | null>(null);
  const [tidying, setTidying] = useState(false);

  // Memories (active only)
  useEffect(() => {
    const huddleQ = query(
      collection(db, "teams", team.id, "huddles", huddle.id, "memory"),
      orderBy("createdAt", "desc")
    );
    const unsub1 = onSnapshot(huddleQ, (snap) => {
      setHuddleMemories(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Memory))
          .filter((m) => m.status !== "archived")
      );
    });

    const teamQ = query(
      collection(db, "teams", team.id, "memory"),
      orderBy("createdAt", "desc")
    );
    const unsub2 = onSnapshot(teamQ, (snap) => {
      setTeamMemories(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Memory))
          .filter((m) => m.status !== "archived")
      );
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [team.id, huddle.id]);

  // Summary for the active tab
  useEffect(() => {
    const ref =
      tab === "team"
        ? doc(db, "teams", team.id, "memoryMeta", "summary")
        : doc(db, "teams", team.id, "huddles", huddle.id, "memoryMeta", "summary");
    const unsub = onSnapshot(ref, (snap) => {
      setSummary(snap.exists() ? (snap.data() as { text: string; updatedAt: number }) : null);
    });
    return unsub;
  }, [team.id, huddle.id, tab]);

  const memories = tab === "huddle" ? huddleMemories : teamMemories;

  const memRef = (id: string) =>
    tab === "huddle"
      ? doc(db, "teams", team.id, "huddles", huddle.id, "memory", id)
      : doc(db, "teams", team.id, "memory", id);

  const deleteMemory = (id: string) => deleteDoc(memRef(id));
  const togglePin = (id: string, pinned: boolean) =>
    updateDoc(memRef(id), { pinned: !pinned });
  const saveEdit = (id: string, key: string, value: string) =>
    updateDoc(memRef(id), {
      key,
      value,
      editedBy: user?.uid || null,
      updatedAt: Date.now(),
    });

  const tidyUp = async () => {
    setTidying(true);
    try {
      await fetch("/api/ai/memory/consolidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id, huddleId: huddle.id, scope: tab }),
      });
    } catch (err) {
      console.error("Tidy up failed:", err);
    } finally {
      setTidying(false);
    }
  };

  const grouped = MEMORY_CATEGORIES.map(
    (cat) =>
      [cat, memories.filter((m) => (m.category || "Other") === cat)] as const
  ).filter(([, items]) => items.length > 0);

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

      <div className="flex-1 overflow-y-auto">
        {/* Summary */}
        <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
              Summary
            </p>
            <button
              onClick={tidyUp}
              disabled={tidying}
              className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-600 transition-colors hover:bg-indigo-500/20 disabled:opacity-50"
              title="Merge duplicates, drop stale notes, and refresh this summary"
            >
              {tidying ? "Tidying…" : "Tidy up"}
            </button>
          </div>
          {summary?.text ? (
            <>
              <div className="text-xs text-gray-600">
                <Markdown>{summary.text}</Markdown>
              </div>
              <p className="mt-1 text-[10px] text-gray-300">
                Updated {new Date(summary.updatedAt).toLocaleString()}
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-400">
              No summary yet — tap “Tidy up” to clean up and summarize these
              memories.
            </p>
          )}
        </div>

        {/* Grouped facts */}
        <div className="px-4 py-3">
          {memories.length === 0 ? (
            <p className="text-center text-xs text-gray-400">
              No memories yet. The AI builds knowledge as conversations happen.
            </p>
          ) : (
            grouped.map(([cat, items]) => (
              <div key={cat} className="mb-4">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {cat} ({items.length})
                </p>
                {items.map((mem) => (
                  <MemoryItem
                    key={mem.id}
                    memory={mem}
                    onDelete={() => deleteMemory(mem.id)}
                    onTogglePin={() => togglePin(mem.id, !!mem.pinned)}
                    onSave={(k, v) => saveEdit(mem.id, k, v)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function MemoryItem({
  memory,
  onDelete,
  onTogglePin,
  onSave,
}: {
  memory: Memory;
  onDelete: () => void;
  onTogglePin: () => void;
  onSave: (key: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState(memory.key);
  const [value, setValue] = useState(memory.value);

  return (
    <div className="group mb-2 rounded-lg bg-gray-50 p-3">
      {editing ? (
        <div>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="mb-1 w-full rounded border border-indigo-200 px-2 py-1 text-xs font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            placeholder="Label"
          />
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={2}
            className="w-full resize-none rounded border border-indigo-200 px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            placeholder="Fact"
          />
          <div className="mt-1 flex gap-2 text-[11px]">
            <button
              onClick={() => {
                if (key.trim() && value.trim()) onSave(key.trim(), value.trim());
                setEditing(false);
              }}
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              Save
            </button>
            <button
              onClick={() => {
                setKey(memory.key);
                setValue(memory.value);
                setEditing(false);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <p className="flex items-center gap-1 text-xs font-medium text-gray-700">
              {memory.pinned && <span title="Pinned">📌</span>}
              {memory.key}
            </p>
            <div className="ml-2 flex shrink-0 gap-2 text-[11px] text-gray-300 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={onTogglePin}
                className="hover:text-indigo-500"
                title={memory.pinned ? "Unpin" : "Pin (protect from auto-cleanup)"}
              >
                {memory.pinned ? "Unpin" : "Pin"}
              </button>
              <button
                onClick={() => setEditing(true)}
                className="hover:text-indigo-500"
              >
                Edit
              </button>
              <button onClick={onDelete} className="hover:text-red-400">
                Delete
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">{memory.value}</p>
          <p className="mt-1 text-[10px] text-gray-300">
            {memory.editedBy ? "edited" : memory.source || "auto"} ·{" "}
            {new Date(memory.updatedAt || memory.createdAt).toLocaleDateString()}
          </p>
        </>
      )}
    </div>
  );
}
