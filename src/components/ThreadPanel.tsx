"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Org, Room, Message } from "@/types";
import { MessageInput } from "./MessageInput";

interface ThreadPanelProps {
  room: Room;
  org: Org;
  threadId: string;
}

export function ThreadPanel({ room, org, threadId }: ThreadPanelProps) {
  const [parentMessage, setParentMessage] = useState<Message | null>(null);
  const [replies, setReplies] = useState<Message[]>([]);

  useEffect(() => {
    // Load parent message
    getDoc(
      doc(db, "orgs", org.id, "rooms", room.id, "messages", threadId)
    ).then((snap) => {
      if (snap.exists()) {
        setParentMessage({ id: snap.id, ...snap.data() } as Message);
      }
    });

    // Listen to thread replies — filter client-side to avoid needing a composite index
    const q = query(
      collection(db, "orgs", org.id, "rooms", room.id, "messages"),
      where("threadId", "==", threadId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Message))
        .sort((a, b) => a.createdAt - b.createdAt);
      setReplies(msgs);
    });

    return unsub;
  }, [org.id, room.id, threadId]);

  return (
    <div className="flex h-full flex-col">
      {/* Parent message */}
      {parentMessage && (
        <div className="border-b border-gray-100 px-4 py-3">
          <p className="text-xs font-medium text-gray-500">
            {parentMessage.isAI ? "Huddle AI" : parentMessage.authorName}
          </p>
          <p className="mt-1 text-sm text-gray-800">{parentMessage.text}</p>
        </div>
      )}

      {/* Replies */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {replies.map((msg) => (
          <div key={msg.id} className="mb-3 flex gap-2">
            {msg.isAI ? (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-medium text-indigo-600">
                AI
              </div>
            ) : msg.authorPhoto ? (
              <img
                src={msg.authorPhoto}
                alt=""
                className="h-6 w-6 shrink-0 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-600">
                {msg.authorName?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-gray-500">
                {msg.isAI ? "Huddle AI" : msg.authorName}
                <span className="ml-2 font-normal text-gray-400">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </p>
              <p className="mt-0.5 text-sm text-gray-800">{msg.text}</p>
            </div>
          </div>
        ))}

        {replies.length === 0 && (
          <p className="text-center text-xs text-gray-400">No replies yet</p>
        )}
      </div>

      {/* Thread input */}
      <MessageInput room={room} org={org} threadId={threadId} />
    </div>
  );
}
