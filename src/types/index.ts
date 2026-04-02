export type AIPresence = "off" | "on-demand" | "active";

export interface Org {
  id: string;
  name: string;
  members: string[]; // user UIDs
  joinCode: string; // 6-char alphanumeric code
  createdBy: string;
  createdAt: number;
}

export interface Room {
  id: string;
  orgId: string;
  name: string;
  members: string[]; // user UIDs, empty = open to all org members
  aiPresence: AIPresence;
  createdBy: string;
  createdAt: number;
}

export interface Message {
  id: string;
  roomId: string;
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

export interface RoomFile {
  id: string;
  roomId: string;
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
  source: string; // which message/conversation it came from
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
  orgId: string;
  email: string;
  invitedBy: string;
  createdAt: number;
  accepted: boolean;
}
