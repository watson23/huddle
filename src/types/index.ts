export type AIPresence = "off" | "on-demand" | "active";

export interface Team {
  id: string;
  name: string;
  members: string[]; // user UIDs
  joinCode: string; // 6-char alphanumeric code
  joinLocked?: boolean; // when true, no one new can join by code/link
  createdBy: string;
  createdAt: number;
}

export interface Huddle {
  id: string;
  teamId: string;
  name: string;
  members: string[]; // user UIDs, empty = open to all team members
  aiPresence: AIPresence;
  // Active mode: when the AI wants to chime in but isn't sure, it "raises its
  // hand". Stored on the huddle (not client state) so every member sees the
  // same pending hand, and expanding it can be de-duplicated across clients.
  aiRaisedHand?: { teaser: string; messageId: string } | null;
  createdBy: string;
  createdAt: number;
}

export interface Message {
  id: string;
  huddleId: string;
  author: string; // user UID or "ai"
  authorName: string;
  authorPhoto?: string;
  text: string;
  isAI: boolean;
  threadId?: string; // if this is a thread reply
  attachments?: FileAttachment[];
  createdAt: number;
  editedAt?: number;
  reactions?: Record<string, string[]>; // emoji -> user UIDs who reacted
}

export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface HuddleFile {
  id: string;
  huddleId: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  createdAt: number;
}

export const MEMORY_CATEGORIES = [
  "Decision",
  "Person",
  "Project",
  "Terminology",
  "Action item",
  "Preference",
  "Other",
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export interface Memory {
  id: string;
  key: string;
  value: string;
  source: string;
  category?: MemoryCategory;
  pinned?: boolean; // human-curated: never auto-modified or auto-archived
  status?: "active" | "archived"; // missing = active (legacy)
  editedBy?: string; // uid of last human editor
  createdAt: number;
  updatedAt: number;
  lastConfirmedAt?: number; // last time the AI re-saw this fact
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

export interface Invite {
  id: string;
  teamId: string;
  email: string;
  invitedBy: string;
  createdAt: number;
  accepted: boolean;
}
