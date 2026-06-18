import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
import { storage, db } from "@/lib/firebase";
import type { FileAttachment } from "@/types";

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Upload a file to Firebase Storage for a huddle and record it in the huddle's
 * `files` subcollection (so it shows up in the Files panel). Returns a
 * FileAttachment that can also be embedded in a message.
 *
 * Throws on oversize files or on a Storage failure (e.g. Storage not enabled,
 * or security rules denying the write) — callers should surface the error.
 */
export async function uploadHuddleFile(
  teamId: string,
  huddleId: string,
  file: File,
  uploadedBy: string
): Promise<FileAttachment> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File is too large (max 25 MB).");
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `teams/${teamId}/huddles/${huddleId}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  const docRef = await addDoc(
    collection(db, "teams", teamId, "huddles", huddleId, "files"),
    {
      huddleId,
      name: file.name,
      url,
      type: file.type,
      size: file.size,
      uploadedBy,
      createdAt: Date.now(),
    }
  );

  return { id: docRef.id, name: file.name, url, type: file.type, size: file.size };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
