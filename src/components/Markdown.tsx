"use client";

import ReactMarkdown from "react-markdown";

// Lightweight markdown renderer for AI messages. Tailwind's typography plugin
// isn't installed, so element styles are applied per-tag here.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed text-gray-800">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 underline hover:text-indigo-700"
            >
              {children}
            </a>
          ),
          h1: ({ children }) => (
            <h1 className="mb-2 mt-1 text-base font-semibold text-gray-900">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-1 text-base font-semibold text-gray-900">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1 mt-1 text-sm font-semibold text-gray-900">{children}</h3>
          ),
          code: ({ children }) => (
            <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.8em] text-gray-800">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="mb-2 overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100 last:mb-0">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-2 border-l-2 border-gray-300 pl-3 italic text-gray-600 last:mb-0">
              {children}
            </blockquote>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
