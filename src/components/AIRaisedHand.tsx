"use client";

interface AIRaisedHandProps {
  teaser: string;
  onExpand: () => void;
  onDismiss: () => void;
}

export function AIRaisedHand({ teaser, onExpand, onDismiss }: AIRaisedHandProps) {
  return (
    <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3 ring-1 ring-indigo-100 animate-in fade-in">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm">
        <span className="animate-bounce">✋</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-indigo-600">Huddle AI</p>
        <p className="text-sm text-indigo-800/70">{teaser}</p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button
          onClick={onExpand}
          className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-600"
        >
          Hear it
        </button>
        <button
          onClick={onDismiss}
          className="rounded-lg px-2 py-1.5 text-xs text-indigo-400 transition-colors hover:bg-indigo-100 hover:text-indigo-600"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
