import Link from "next/link";

export const metadata = {
  title: "How it works · ShodoHuddle",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-gray-100 py-8">
      <h2 className="mb-3 text-xl font-bold text-gray-900">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-gray-600">
        {children}
      </div>
    </section>
  );
}

export default function HelpPage() {
  return (
    <div className="min-h-full overflow-y-auto bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="mx-auto max-w-2xl px-5 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-10 w-10" />
          <img src="/logo-text.png" alt="shodohuddle" className="h-4 w-auto" />
          <div className="flex-1" />
          <Link
            href="/app"
            className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
          >
            Open the app
          </Link>
        </div>

        <div className="rounded-2xl bg-white px-7 py-2 shadow-lg">
          <div className="pt-6">
            <h1 className="text-2xl font-bold text-gray-900">How ShodoHuddle works</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-600">
              ShodoHuddle is a team chatroom where AI is a participant, not just
              a tool. Your team talks together in focused rooms called{" "}
              <strong>huddles</strong>, and an AI teammate listens, remembers,
              and chimes in when it can help. This page explains how it behaves —
              including what it&apos;s good at and where to be careful.
            </p>
          </div>

          <Section title="The AI is a participant you can dial up or down">
            <p>
              Every huddle has an AI presence setting you cycle from the toggle
              in the header:
            </p>
            <ul className="space-y-2">
              <li className="flex gap-2.5">
                <span className="mt-0.5 shrink-0 self-start rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                  Off
                </span>
                <span>
                  The AI never speaks. (It still quietly builds memory — see
                  below — so it&apos;s ready when you turn it on.)
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-0.5 shrink-0 self-start rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                  On-demand
                </span>
                <span>
                  The AI only replies when you ask it — tap{" "}
                  <strong>Ask AI</strong> next to the message box, or mention{" "}
                  <code className="rounded bg-gray-100 px-1 text-[13px]">@ai</code>{" "}
                  in your message.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-0.5 shrink-0 self-start rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600">
                  Active
                </span>
                <span>
                  The AI follows along and decides for itself when to jump in.
                  It&apos;s deliberately restrained — most of the time people are
                  talking to each other and it stays quiet. When it has something
                  genuinely useful it either chimes in, or &ldquo;raises its
                  hand&rdquo; with a hint you can expand if you want to hear it.
                </span>
              </li>
            </ul>
          </Section>

          <Section title="Shared memory — the heart of it">
            <p>
              As you talk, the AI distills durable facts from the conversation —
              decisions, people, projects, terminology, action items — into a{" "}
              <strong>shared team memory</strong> (the lightbulb icon). This is
              what makes the AI more useful over time: it carries context forward
              instead of starting fresh every conversation.
            </p>
            <p>How it stays useful rather than turning into noise:</p>
            <ul className="ml-4 list-disc space-y-1.5">
              <li>
                <strong>It reconciles, not just appends.</strong> When something
                is already known, the AI updates that note instead of adding a
                near-duplicate. A changed decision (&ldquo;launch moved to the
                8th&rdquo;) edits the existing entry.
              </li>
              <li>
                <strong>It&apos;s organized.</strong> Memories are grouped by
                category, and split between this huddle and the wider team.
              </li>
              <li>
                <strong>You can tidy it.</strong> The <strong>Tidy up</strong>{" "}
                button merges duplicates, drops stale notes, and refreshes a
                plain-language summary at the top. It also tidies itself
                automatically as it grows.
              </li>
              <li>
                <strong>You&apos;re in charge.</strong> Edit any memory, delete
                ones you don&apos;t want, or <strong>pin</strong> the important
                ones — pinned memories are never changed by the automatic
                cleanup.
              </li>
            </ul>
          </Section>

          <Section title="Talking together">
            <p>
              <strong>Threads</strong> let you reply to a specific message
              without cluttering the main chat. <strong>Reactions</strong> (👍 ❤️
              😂 …) work on any message, including the AI&apos;s. You can{" "}
              <strong>edit or delete</strong> your own messages, and you&apos;ll
              see who&apos;s online. Invite teammates with a join code or link;
              the team owner can rotate the code or lock joining.
            </p>
          </Section>

          <Section title="What it&apos;s great at">
            <ul className="ml-4 list-disc space-y-1.5">
              <li>
                Keeping a group on the same page — the AI can answer factual
                questions, summarize a thread, or surface a relevant past
                decision mid-discussion.
              </li>
              <li>
                Building a living, shared understanding of your work that
                outlives any single conversation.
              </li>
              <li>
                Staying out of the way — in Active mode it errs toward silence,
                so it feels like a thoughtful teammate, not a chatbot.
              </li>
            </ul>
          </Section>

          <Section title="What to keep in mind">
            <p>
              It&apos;s an AI teammate, not an oracle. A few honest limitations:
            </p>
            <ul className="ml-4 list-disc space-y-1.5">
              <li>
                <strong>It can be wrong.</strong> Like any AI, it can state
                something confidently that isn&apos;t accurate. Double-check
                anything that matters before relying on it.
              </li>
              <li>
                <strong>Memory is auto-extracted.</strong> It may capture a fact
                imperfectly or miss nuance. That&apos;s why you can edit, delete,
                and pin — treat the memory as a helpful draft you can correct,
                not gospel.
              </li>
              <li>
                <strong>It won&apos;t catch everything.</strong> Active mode
                chooses when to speak and leans quiet, so it may stay silent when
                you&apos;d have liked input — just ask it directly.
              </li>
              <li>
                <strong>Memory is shared with the whole team.</strong> Anything
                discussed in a huddle can end up in the shared memory and be seen
                by teammates and the AI. Don&apos;t put anything in a huddle you
                wouldn&apos;t want the team to see.
              </li>
              <li>
                <strong>It works from recent context, not infinite history.</strong>{" "}
                The AI reads the recent conversation plus the saved memory — not
                every message ever sent. The memory is how important things
                persist.
              </li>
            </ul>
          </Section>

          <Section title="Your data & privacy">
            <p>
              Conversations and memory live in your team&apos;s workspace and are
              shared among its members. Messages are sent to the AI model to
              generate replies and to build memory. Keep sensitive information
              out of huddles unless everyone on the team — and the AI — should
              have it.
            </p>
          </Section>

          <Section title="A note on the beta">
            <p>
              ShodoHuddle is in early beta, so things are still evolving and some
              features (like file sharing) aren&apos;t switched on yet. If a
              feature would be useful to you, or something feels off, that
              feedback genuinely shapes what gets built next.
            </p>
          </Section>

          <div className="border-t border-gray-100 py-6 text-center">
            <Link
              href="/app"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              ← Back to the app
            </Link>
            <p className="mt-3 text-xs text-gray-400">
              Part of the Shodo product family
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
