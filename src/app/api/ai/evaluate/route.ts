import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import Anthropic from "@anthropic-ai/sdk";
import type { Message, Memory } from "@/types";

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const EVALUATION_PROMPT = `You are Huddle AI, observing a group conversation. Your job is to decide whether to participate.

Evaluate the recent conversation and respond with ONE of these three options:

SILENT
(No explanation needed — the conversation doesn't need your input)

RAISE_HAND: <teaser>
(You have something useful to add but it's not urgent. The teaser should be 5-15 words hinting at what you'd say, like "I know something about that API issue" or "There might be a simpler approach to this")

SPEAK: <full response>
(The conversation clearly needs your input RIGHT NOW — someone asked a factual question no one answered, there's a significant misunderstanding, or your input would meaningfully move the discussion forward. Keep responses under 150 words.)

Guidelines:
- Default to SILENT. Most of the time, humans are talking to each other and don't need you.
- Use RAISE_HAND when you have genuinely useful information but the humans are mid-discussion.
- Only SPEAK when there's a clear opening and high value — unanswered questions, factual errors, or synthesis moments.
- Never SPEAK just to agree, summarize what was just said, or make small talk.
- Consider the conversation flow — if humans are in rapid back-and-forth, lean toward SILENT or RAISE_HAND.
- If someone recently addressed the AI or mentioned @ai, lean toward SPEAK.

Respond with EXACTLY one of the three formats above, nothing else.`;

export async function POST(req: NextRequest) {
  const { orgId, roomId, threadId } = await req.json();

  if (!orgId || !roomId) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const db = getAdminDb();

  // Fetch recent messages
  const messagesRef = db
    .collection("orgs")
    .doc(orgId)
    .collection("rooms")
    .doc(roomId)
    .collection("messages");

  let msgQuery = messagesRef.orderBy("createdAt", "desc").limit(30);
  if (threadId) {
    msgQuery = messagesRef
      .where("threadId", "==", threadId)
      .orderBy("createdAt", "desc")
      .limit(30);
  }

  const msgSnap = await msgQuery.get();
  const messages: Message[] = msgSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Message))
    .reverse();

  if (messages.length === 0) {
    return NextResponse.json({ decision: "SILENT" });
  }

  // Fetch memories for context
  const roomMemSnap = await db
    .collection("orgs")
    .doc(orgId)
    .collection("rooms")
    .doc(roomId)
    .collection("memory")
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();

  const memories: Memory[] = roomMemSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as Memory)
  );

  const memoryContext =
    memories.length > 0
      ? "\n\nYour memories about this room:\n" +
        memories.map((m) => `- ${m.key}: ${m.value}`).join("\n")
      : "";

  const conversationText = messages
    .map((m) => `${m.isAI ? "AI" : m.authorName}: ${m.text}`)
    .join("\n");

  const response = await getClient().messages.create({
    model: "claude-haiku-3-5-20241022",
    max_tokens: 256,
    system: EVALUATION_PROMPT + memoryContext,
    messages: [
      {
        role: "user",
        content: `Here is the recent conversation:\n\n${conversationText}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text.trim() : "";

  if (text === "SILENT") {
    return NextResponse.json({ decision: "SILENT" });
  }

  if (text.startsWith("RAISE_HAND:")) {
    const teaser = text.slice("RAISE_HAND:".length).trim();
    return NextResponse.json({ decision: "RAISE_HAND", teaser });
  }

  if (text.startsWith("SPEAK:")) {
    const message = text.slice("SPEAK:".length).trim();
    return NextResponse.json({ decision: "SPEAK", message });
  }

  // If the response doesn't match the expected format, default to SILENT
  return NextResponse.json({ decision: "SILENT" });
}
