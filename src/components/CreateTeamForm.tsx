"use client";

import { useState } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Team } from "@/types";

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

interface CreateTeamFormProps {
  onCreated: (team: Team) => void;
}

export function CreateTeamForm({ onCreated }: CreateTeamFormProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;

    setCreating(true);
    const code = generateJoinCode();
    const docRef = await addDoc(collection(db, "teams"), {
      name: name.trim(),
      members: [user.uid],
      joinCode: code,
      createdBy: user.uid,
      createdAt: Date.now(),
    });

    onCreated({
      id: docRef.id,
      name: name.trim(),
      members: [user.uid],
      joinCode: code,
      createdBy: user.uid,
      createdAt: Date.now(),
    });
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !user) return;

    setJoining(true);
    setJoinError("");

    const q = query(
      collection(db, "teams"),
      where("joinCode", "==", joinCode.trim().toUpperCase())
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      setJoinError("No team found with that code.");
      setJoining(false);
      return;
    }

    const teamDoc = snap.docs[0];
    const teamData = teamDoc.data();

    if (teamData.members?.includes(user.uid)) {
      onCreated({ id: teamDoc.id, ...teamData } as Team);
      return;
    }

    await updateDoc(doc(db, "teams", teamDoc.id), {
      members: arrayUnion(user.uid),
    });

    onCreated({
      id: teamDoc.id,
      ...teamData,
      members: [...(teamData.members || []), user.uid],
    } as Team);
  };

  if (mode === "choose") {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
          <div className="mb-6 flex flex-col items-center">
            <img src="/logo.png" alt="ShodoHuddle" className="h-14 w-auto" />
            <img src="/logo-text.png" alt="shodohuddle" className="mt-2 h-4 w-auto" />
            <p className="mt-3 text-sm text-gray-500">
              Create a new workspace or join an existing one.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setMode("create")}
              className="w-full rounded-lg bg-indigo-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
            >
              Create a team
            </button>
            <button
              onClick={() => setMode("join")}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Join with a code
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "join") {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            Join a team
          </h2>
          <p className="mb-6 text-sm text-gray-500">
            Enter the 6-character code shared by your team.
          </p>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase().slice(0, 6));
                setJoinError("");
              }}
              placeholder="e.g. AB3XY7"
              className="mb-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-center font-mono text-lg tracking-widest focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
              maxLength={6}
            />
            {joinError && (
              <p className="mb-2 text-xs text-red-500">{joinError}</p>
            )}
            <button
              type="submit"
              disabled={joinCode.length !== 6 || joining}
              className="mb-3 w-full rounded-lg bg-indigo-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
            >
              {joining ? "Joining..." : "Join"}
            </button>
          </form>
          <button
            onClick={() => setMode("choose")}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-600"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          Create your team
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          This is your workspace in ShodoHuddle.
        </p>
        <form onSubmit={handleCreate}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Team name"
            className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={!name.trim() || creating}
            className="mb-3 w-full rounded-lg bg-indigo-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Team"}
          </button>
        </form>
        <button
          onClick={() => setMode("choose")}
          className="w-full text-center text-xs text-gray-400 hover:text-gray-600"
        >
          Back
        </button>
      </div>
    </div>
  );
}
