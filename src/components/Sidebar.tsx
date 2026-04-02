"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence } from "@/hooks/usePresence";
import type { Org, Room, AIPresence } from "@/types";

interface SidebarProps {
  org: Org;
  activeRoom: Room | null;
  onSelectRoom: (room: Room) => void;
}

export function Sidebar({ org, activeRoom, onSelectRoom }: SidebarProps) {
  const { user, signOut } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [creating, setCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const { members, isOnline } = usePresence(org.id);

  useEffect(() => {
    const q = query(collection(db, "orgs", org.id, "rooms"));
    const unsub = onSnapshot(q, (snap) => {
      const roomList = snap.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Room)
      );
      roomList.sort((a, b) => a.createdAt - b.createdAt);
      setRooms(roomList);
    });
    return unsub;
  }, [org.id]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || !user) return;

    await addDoc(collection(db, "orgs", org.id, "rooms"), {
      orgId: org.id,
      name: newRoomName.trim(),
      members: [],
      aiPresence: "on-demand" as AIPresence,
      createdBy: user.uid,
      createdAt: Date.now(),
    });

    setNewRoomName("");
    setCreating(false);
  };

  return (
    <div className="flex h-full flex-col bg-[#1e1e2e] text-[#cdd6f4]">
      {/* Org header */}
      <div className="border-b border-white/10 px-4 py-4">
        <h2 className="truncate text-sm font-semibold text-white">
          {org.name}
        </h2>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => onSelectRoom(room)}
            className={`mb-0.5 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
              activeRoom?.id === room.id
                ? "bg-indigo-500/20 text-white"
                : "text-[#cdd6f4] hover:bg-[#313244]"
            }`}
          >
            <span className="text-gray-500">#</span>
            <span className="truncate">{room.name}</span>
          </button>
        ))}

        {creating ? (
          <form onSubmit={handleCreateRoom} className="mt-1 px-1">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Room name"
              className="w-full rounded-md border border-white/10 bg-[#313244] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
              autoFocus
              onBlur={() => {
                if (!newRoomName.trim()) setCreating(false);
              }}
            />
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-500 transition-colors hover:bg-[#313244] hover:text-gray-300"
          >
            <span>+</span>
            <span>New room</span>
          </button>
        )}
      </div>

      {/* Members */}
      <div className="border-t border-white/10 px-2 py-2">
        <p className="mb-1 px-3 text-[10px] uppercase tracking-wider text-gray-500">
          Members ({members.length})
        </p>
        <div className="max-h-32 overflow-y-auto">
          {members
            .sort((a, b) => {
              const aOn = isOnline(a) ? 0 : 1;
              const bOn = isOnline(b) ? 0 : 1;
              return aOn - bOn;
            })
            .map((m) => (
              <div
                key={m.uid}
                className="flex items-center gap-2 rounded-md px-3 py-1.5"
              >
                <div className="relative shrink-0">
                  {m.photoURL ? (
                    <img
                      src={m.photoURL}
                      alt=""
                      className="h-5 w-5 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-600 text-[9px] text-white">
                      {m.displayName?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#1e1e2e] ${
                      isOnline(m) ? "bg-green-400" : "bg-gray-500"
                    }`}
                  />
                </div>
                <span
                  className={`truncate text-xs ${
                    isOnline(m) ? "text-gray-200" : "text-gray-500"
                  }`}
                >
                  {m.displayName}
                  {m.uid === user?.uid && (
                    <span className="ml-1 text-gray-500">(you)</span>
                  )}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Invite section */}
      <div className="px-3 pb-2">
        {showInvite ? (
          <div className="rounded-md border border-white/10 bg-[#313244] p-3">
            <p className="mb-2 text-center text-[10px] uppercase tracking-wider text-gray-500">
              Join code
            </p>
            <p className="mb-3 text-center font-mono text-lg tracking-widest text-white">
              {org.joinCode || "—"}
            </p>
            <button
              onClick={() => {
                const text = org.joinCode
                  ? `Join my Huddle workspace!\nCode: ${org.joinCode}\nOr use this link: ${window.location.origin}/join/${org.id}`
                  : `${window.location.origin}/join/${org.id}`;
                navigator.clipboard.writeText(text);
                setInviteCopied(true);
                setTimeout(() => setInviteCopied(false), 2000);
              }}
              className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-indigo-500/20 px-3 py-1.5 text-xs text-indigo-300 transition-colors hover:bg-indigo-500/30"
            >
              {inviteCopied ? "Copied!" : "Copy invite"}
            </button>
            <button
              onClick={() => setShowInvite(false)}
              className="w-full text-center text-[10px] text-gray-500 hover:text-gray-400"
            >
              Close
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowInvite(true)}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs text-gray-400 transition-colors hover:bg-[#313244] hover:text-gray-200"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Invite people
          </button>
        )}
      </div>

      {/* User section */}
      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          {user?.photoURL && (
            <img
              src={user.photoURL}
              alt=""
              className="h-8 w-8 rounded-full"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-white">
              {user?.displayName}
            </p>
          </div>
          <button
            onClick={signOut}
            className="rounded p-1 text-gray-500 hover:bg-[#313244] hover:text-gray-300"
            title="Sign out"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
