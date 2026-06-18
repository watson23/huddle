"use client";

import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { uploadHuddleFile, formatBytes } from "@/lib/storage-helpers";
import type { Team, Huddle, HuddleFile } from "@/types";

interface FilesPanelProps {
  huddle: Huddle;
  team: Team;
}

export function FilesPanel({ huddle, team }: FilesPanelProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<HuddleFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, "teams", team.id, "huddles", huddle.id, "files"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setFiles(snap.docs.map((d) => ({ id: d.id, ...d.data() } as HuddleFile)));
    });
    return unsub;
  }, [team.id, huddle.id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    setError(null);
    try {
      await uploadHuddleFile(team.id, huddle.id, file, user.uid);
    } catch (err) {
      console.error("File upload failed:", err);
      setError(
        "Upload failed. Make sure Firebase Storage is enabled and its rules allow team members to write."
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-100 p-3">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleUpload}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload a file"}
        </button>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {files.length === 0 ? (
          <p className="mt-4 text-center text-xs text-gray-400">
            No files shared yet.
          </p>
        ) : (
          files.map((f) => (
            <a
              key={f.id}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group mb-2 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-gray-700 group-hover:text-indigo-600">
                  {f.name}
                </p>
                <p className="text-[11px] text-gray-400">
                  {formatBytes(f.size)} ·{" "}
                  {new Date(f.createdAt).toLocaleDateString()}
                </p>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
