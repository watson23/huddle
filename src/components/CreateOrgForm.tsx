"use client";

import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Org } from "@/types";

interface CreateOrgFormProps {
  onCreated: (org: Org) => void;
}

export function CreateOrgForm({ onCreated }: CreateOrgFormProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;

    setCreating(true);
    const docRef = await addDoc(collection(db, "orgs"), {
      name: name.trim(),
      members: [user.uid],
      createdBy: user.uid,
      createdAt: Date.now(),
    });

    onCreated({
      id: docRef.id,
      name: name.trim(),
      members: [user.uid],
      createdBy: user.uid,
      createdAt: Date.now(),
    });
  };

  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          Create your organization
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          This is your team workspace in Huddle.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Organization name"
            className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={!name.trim() || creating}
            className="w-full rounded-lg bg-indigo-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Organization"}
          </button>
        </form>
      </div>
    </div>
  );
}
