"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Org } from "@/types";
import { CreateOrgForm } from "@/components/CreateOrgForm";
import { AppShell } from "@/components/AppShell";

export default function AppPage() {
  const { user } = useAuth();
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOrg, setNeedsOrg] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function loadOrg() {
      // Find an org where the user is a member
      const q = query(
        collection(db, "orgs"),
        where("members", "array-contains", user!.uid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const orgDoc = snap.docs[0];
        const orgData = { id: orgDoc.id, ...orgDoc.data() } as Org;

        // Backfill join code for orgs created before this feature
        if (!orgData.joinCode) {
          const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          let code = "";
          for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
          await updateDoc(doc(db, "orgs", orgDoc.id), { joinCode: code });
          orgData.joinCode = code;
        }

        setOrg(orgData);
      } else {
        setNeedsOrg(true);
      }
      setLoading(false);
    }

    loadOrg();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (needsOrg) {
    return <CreateOrgForm onCreated={(org) => { setOrg(org); setNeedsOrg(false); }} />;
  }

  return <AppShell org={org!} />;
}
