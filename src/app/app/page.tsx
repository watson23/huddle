"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Team } from "@/types";
import { CreateTeamForm } from "@/components/CreateTeamForm";
import { AppShell } from "@/components/AppShell";

export default function AppPage() {
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsTeam, setNeedsTeam] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function loadTeam() {
      // Find a team where the user is a member
      const q = query(
        collection(db, "teams"),
        where("members", "array-contains", user!.uid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const teamDoc = snap.docs[0];
        const teamData = { id: teamDoc.id, ...teamDoc.data() } as Team;

        // Backfill join code for teams created before this feature
        if (!teamData.joinCode) {
          const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          let code = "";
          for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
          await updateDoc(doc(db, "teams", teamDoc.id), { joinCode: code });
          teamData.joinCode = code;
        }

        setTeam(teamData);
      } else {
        setNeedsTeam(true);
      }
      setLoading(false);
    }

    loadTeam();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (needsTeam) {
    return <CreateTeamForm onCreated={(team) => { setTeam(team); setNeedsTeam(false); }} />;
  }

  return <AppShell team={team!} />;
}
