"use client";

import type { Org, Room } from "@/types";

interface FilesPanelProps {
  room: Room;
  org: Org;
}

export function FilesPanel({ room, org }: FilesPanelProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-600">File sharing</p>
      <p className="mt-1 text-xs text-gray-400">
        Coming soon — file storage is being set up.
      </p>
    </div>
  );
}
