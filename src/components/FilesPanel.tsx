"use client";

import { useEffect, useState, useRef } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Org, Room, RoomFile } from "@/types";

interface FilesPanelProps {
  room: Room;
  org: Org;
}

export function FilesPanel({ room, org }: FilesPanelProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<RoomFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, "orgs", org.id, "rooms", room.id, "files"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setFiles(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoomFile))
      );
    });
    return unsub;
  }, [org.id, room.id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be under 10MB");
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(
        storage,
        `orgs/${org.id}/rooms/${room.id}/${Date.now()}_${file.name}`
      );
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await addDoc(
        collection(db, "orgs", org.id, "rooms", room.id, "files"),
        {
          roomId: room.id,
          name: file.name,
          url,
          type: file.type,
          size: file.size,
          uploadedBy: user.uid,
          createdAt: Date.now(),
        }
      );
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="flex h-full flex-col">
      {/* Upload button */}
      <div className="border-b border-gray-100 px-4 py-3">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleUpload}
          className="hidden"
          accept="image/*,.pdf,.txt,.md,.json,.csv,.js,.ts,.tsx,.py"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-lg border border-dashed border-gray-300 px-4 py-2 text-xs text-gray-500 transition-colors hover:border-indigo-300 hover:text-indigo-500"
        >
          {uploading ? "Uploading..." : "Upload a file (max 10MB)"}
        </button>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {files.length === 0 ? (
          <p className="text-center text-xs text-gray-400">
            No files shared yet
          </p>
        ) : (
          files.map((file) => (
            <a
              key={file.id}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-2 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gray-100 text-xs text-gray-500">
                {file.type.startsWith("image/") ? "IMG" : "DOC"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-gray-800">{file.name}</p>
                <p className="text-[10px] text-gray-400">
                  {formatSize(file.size)}
                </p>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
