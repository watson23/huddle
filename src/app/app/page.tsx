"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Team } from "@/types";
import { CreateTeamForm } from "@/components/CreateTeamForm";
import { AppShell } from "@/components/AppShell";

const LS_KEY = "shodohuddle_activeTeamId";

export default function AppPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateTeam, setShowCreateTeam] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function loadTeams() {
      const q = query(
        collection(db, "teams"),
        where("members", "array-contains", user!.uid)
      );
      const snap = await getDocs(q);
      const teamList: Team[] = [];

      for (const teamDoc of snap.docs) {
        const teamData = { id: teamDoc.id, ...teamDoc.data() } as Team;

        // Backfill join code for teams created before this feature
        if (!teamData.joinCode) {
          const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          let code = "";
          for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
          await updateDoc(doc(db, "teams", teamDoc.id), { joinCode: code });
          teamData.joinCode = code;
        }

        teamList.push(teamData);
      }

      setTeams(teamList);

      // Restore last active team from localStorage, or default to first
      if (teamList.length > 0) {
        const stored = localStorage.getItem(LS_KEY);
        const match = teamList.find((t) => t.id === stored);
        setActiveTeamId(match ? match.id : teamList[0].id);
      }

      setLoading(false);
    }

    loadTeams();
  }, [user]);

  const switchTeam = (teamId: string) => {
    setActiveTeamId(teamId);
    localStorage.setItem(LS_KEY, teamId);
  };

  const handleTeamCreated = (team: Team) => {
    setTeams((prev) => [...prev, team]);
    switchTeam(team.id);
    setShowCreateTeam(false);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (teams.length === 0 || showCreateTeam) {
    return (
      <CreateTeamForm
        onCreated={handleTeamCreated}
        onClose={teams.length > 0 ? () => setShowCreateTeam(false) : undefined}
      />
    );
  }

  const activeTeam = teams.find((t) => t.id === activeTeamId) || teams[0];

  return (
    <AppShell
      team={activeTeam}
      teams={teams}
      onSwitchTeam={switchTeam}
      onCreateTeam={() => setShowCreateTeam(true)}
    />
  );
}
