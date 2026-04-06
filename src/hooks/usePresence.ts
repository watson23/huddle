"use client";

import { useEffect, useState } from "react";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export interface PresenceEntry {
  uid: string;
  displayName: string;
  photoURL: string | null;
  lastSeen: number;
}

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const ONLINE_THRESHOLD = 60_000; // consider offline after 60 seconds

export function usePresence(teamId: string) {
  const { user } = useAuth();
  const [members, setMembers] = useState<PresenceEntry[]>([]);

  // Write presence heartbeat
  useEffect(() => {
    if (!user || !teamId) return;

    const presenceRef = doc(db, "teams", teamId, "presence", user.uid);

    const writePresence = () => {
      setDoc(presenceRef, {
        uid: user.uid,
        displayName: user.displayName || "Anonymous",
        photoURL: user.photoURL || null,
        lastSeen: Date.now(),
      });
    };

    // Write immediately
    writePresence();

    // Then heartbeat every 30s
    const interval = setInterval(writePresence, HEARTBEAT_INTERVAL);

    // Clean up on unmount / tab close
    const handleUnload = () => {
      deleteDoc(presenceRef).catch(() => {});
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);
      deleteDoc(presenceRef).catch(() => {});
    };
  }, [user, teamId]);

  // Listen to all presence entries
  useEffect(() => {
    if (!teamId) return;

    const unsub = onSnapshot(
      collection(db, "teams", teamId, "presence"),
      (snap) => {
        const entries = snap.docs.map((d) => d.data() as PresenceEntry);
        setMembers(entries);
      }
    );

    return unsub;
  }, [teamId]);

  const isOnline = (entry: PresenceEntry) =>
    Date.now() - entry.lastSeen < ONLINE_THRESHOLD;

  return { members, isOnline };
}
