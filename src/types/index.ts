export type AIPresence = "off" | "on-demand" | "active";

export interface Team {
  id: string;
  name: string;
  members: string[]; // user UIDs
  joinCode: string; // 6-char alphanumeric code
  createdBy: string;
  createdAt: number;
}

export interface Huddle {
  id: string;
  teamId: string;
  name: string;
  members: string[]; // user UIDs, empty = open to all team members
  aiPresence: AIPresence;
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

export interface Memory {
  id: string;
  key: string;
  value: string;
  source: string;
  createdAt: number;
  updatedAt: number;
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
