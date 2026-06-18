import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { claimAITurn } from "@/lib/ai-locks";
import {
  fetchActiveMemories,
  applyMemoryOps,
  renderMemoriesForPrompt,
  consolidateScope,
  CONSOLIDATE_THRESHOLD,
  type MemoryOp,
  type MemoryScope,
} from "@/lib/ai/memory-ops";
import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@/types";

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const RECONCILE_PROMPT = `You maintain a shared team memory — a compact, current, de-duplicated knowledge base. You are given the EXISTING memories (each with an id) and NEW conversation since they were last updated. Decide what to record, preferring to refine existing memories over creating near-duplicates.

Return ONLY valid JSON: { "operations": [ ... ] }

Each operation is one of:
- {"op":"add","scope":"huddle"|"team","category":"<category>","key":"short label","value":"the fact in 1-2 sentences"}
- {"op":"update","scope":"huddle"|"team","id":"<existing id>","value":"refined/corrected fact","category":"<category>","key":"short label"}

Rules:
- If a fact is ALREADY captured by an existing memory, do nothing (omit it). Never re-add something that already exists.
- Prefer "update" over "add" when new info refines, corrects, or supersedes an existing memory about the same thing.
- "huddle" scope = specific to this conversation (decisions, action items, local context). "team" scope = broadly relevant across the whole team (people, terminology, projects, processes).
- Allowed categories: Decision, Person, Project, Terminology, Action item, Preference, Other.
- Only record genuinely useful, durable information. Ignore small talk and transient chatter.
- NEVER modify a memory marked [PINNED] — omit it entirely.
- If nothing meaningful is new, return {"operations": []}.`;

function parseOps(text: string): MemoryOp[] {
  const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed.operations) ? parsed.operations : [];
  } catch {
    console.error("Failed to parse memory ops:", text);
    return [];
  }
}

export async function POST(req: NextRequest) {
  const { teamId, huddleId } = await req.json();
  if (!teamId || !huddleId) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const db = getAdminDb();
  const huddleRef = db
    .collection("teams")
    .doc(teamId)
    .collection("huddles")
    .doc(huddleId);
  const messagesRef = huddleRef.collection("messages");

  // Only look at messages newer than the last extraction (watermark) — avoids
  // re-extracting the same facts from an overlapping window every run.
  const huddleSnap = await huddleRef.get();
  const watermark: number = huddleSnap.data()?.lastMemoryExtractAt || 0;

  const newMsgSnap = await messagesRef
    .where("createdAt", ">", watermark)
    .orderBy("createdAt", "asc")
    .limit(100)
    .get();

  const newMessages: Message[] = newMsgSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as Message)
  );

  if (newMessages.length < 3) {
    return NextResponse.json({ extracted: 0, reason: "not enough new messages" });
  }

  // Coordinate across clients: only one should extract for a given state.
  const latestId = newMessages[newMessages.length - 1].id;
  const won = await claimAITurn(teamId, huddleId, "memory", latestId);
  if (!won) {
    return NextResponse.json({ extracted: 0, skipped: true });
  }

  const [huddleMems, teamMems] = await Promise.all([
    fetchActiveMemories(teamId, huddleId, "huddle"),
    fetchActiveMemories(teamId, huddleId, "team"),
  ]);

  const conversationText = newMessages
    .map((m) => `${m.isAI ? "AI" : m.authorName}: ${m.text}`)
    .join("\n");

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: RECONCILE_PROMPT,
    messages: [
      {
        role: "user",
        content: `EXISTING huddle memories:\n${renderMemoriesForPrompt(
          huddleMems
        )}\n\nEXISTING team memories:\n${renderMemoriesForPrompt(
          teamMems
        )}\n\nNEW conversation:\n${conversationText}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const ops = parseOps(text);
  const result = await applyMemoryOps(teamId, huddleId, ops);

  // Advance the watermark past everything we just considered.
  await huddleRef.update({
    lastMemoryExtractAt: newMessages[newMessages.length - 1].createdAt,
  });

  // Auto-tidy any scope whose active count has grown past the threshold.
  for (const scope of ["huddle", "team"] as MemoryScope[]) {
    const base = scope === "huddle" ? huddleMems.length : teamMems.length;
    if (base + result.added > CONSOLIDATE_THRESHOLD) {
      try {
        await consolidateScope(teamId, huddleId, scope);
      } catch (err) {
        console.error(`Auto-consolidate (${scope}) failed:`, err);
      }
    }
  }

  return NextResponse.json({ ...result });
}
