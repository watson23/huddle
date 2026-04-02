import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@/types";

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const EXTRACTION_PROMPT = `You are analyzing a group conversation to extract key facts, decisions, and context that would be useful to remember for future conversations.

Extract memories in this JSON format:
{
  "roomMemories": [
    { "key": "short label", "value": "the fact or decision" }
  ],
  "orgMemories": [
    { "key": "short label", "value": "fact relevant across the entire organization" }
  ]
}

Rules:
- Room memories: specific to this conversation (decisions made, action items, context)
- Org memories: broadly relevant (terminology, people, projects, processes)
- Be concise — each value should be 1-2 sentences
- Only extract genuinely useful information, not trivial chat
- If nothing meaningful was discussed, return empty arrays
- Return valid JSON only, no markdown`;

export async function POST(req: NextRequest) {
  const { orgId, roomId } = await req.json();

  if (!orgId || !roomId) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Fetch recent messages (last 100 for better context)
  const msgSnap = await getAdminDb()
    .collection("orgs")
    .doc(orgId)
    .collection("rooms")
    .doc(roomId)
    .collection("messages")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  const messages: Message[] = msgSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Message))
    .reverse();

  if (messages.length < 3) {
    return NextResponse.json({ extracted: 0 });
  }

  const conversationText = messages
    .map((m) => `${m.isAI ? "AI" : m.authorName}: ${m.text}`)
    .join("\n");

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: EXTRACTION_PROMPT,
    messages: [
      {
        role: "user",
        content: `Extract memories from this conversation:\n\n${conversationText}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const parsed = JSON.parse(text);
    const now = Date.now();

    // Save room memories
    for (const mem of parsed.roomMemories || []) {
      await getAdminDb()
        .collection("orgs")
        .doc(orgId)
        .collection("rooms")
        .doc(roomId)
        .collection("memory")
        .add({
          key: mem.key,
          value: mem.value,
          source: `auto-extracted`,
          createdAt: now,
          updatedAt: now,
        });
    }

    // Save org memories
    for (const mem of parsed.orgMemories || []) {
      await getAdminDb()
        .collection("orgs")
        .doc(orgId)
        .collection("memory")
        .add({
          key: mem.key,
          value: mem.value,
          source: `auto-extracted from room ${roomId}`,
          createdAt: now,
          updatedAt: now,
        });
    }

    return NextResponse.json({
      extracted:
        (parsed.roomMemories?.length || 0) +
        (parsed.orgMemories?.length || 0),
    });
  } catch {
    console.error("Failed to parse memory extraction:", text);
    return NextResponse.json({ error: "Parse failed" }, { status: 500 });
  }
}
