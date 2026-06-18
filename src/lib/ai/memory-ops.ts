import { getAdminDb } from "@/lib/firebase-admin";
import Anthropic from "@anthropic-ai/sdk";
import { MEMORY_CATEGORIES, type MemoryCategory } from "@/types";

export type MemoryScope = "huddle" | "team";

// Auto-tidy a scope once its active memory count crosses this.
export const CONSOLIDATE_THRESHOLD = 40;

export interface StoredMemory {
  id: string;
  key: string;
  value: string;
  category?: MemoryCategory;
  pinned?: boolean;
  status?: "active" | "archived";
}

// One operation the model can emit. `skip` is represented by omission.
export interface MemoryOp {
  op: "add" | "update" | "archive";
  scope: MemoryScope;
  id?: string; // for update / archive
  key?: string;
  value?: string;
  category?: string;
}

function memoryCollection(teamId: string, huddleId: string, scope: MemoryScope) {
  const db = getAdminDb();
  return scope === "team"
    ? db.collection("teams").doc(teamId).collection("memory")
    : db
        .collection("teams")
        .doc(teamId)
        .collection("huddles")
        .doc(huddleId)
        .collection("memory");
}

function normalizeCategory(c?: string): MemoryCategory {
  return (MEMORY_CATEGORIES as readonly string[]).includes(c || "")
    ? (c as MemoryCategory)
    : "Other";
}

/** Active (non-archived) memories for a scope. Legacy docs with no status count as active. */
export async function fetchActiveMemories(
  teamId: string,
  huddleId: string,
  scope: MemoryScope
): Promise<StoredMemory[]> {
  const snap = await memoryCollection(teamId, huddleId, scope)
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as StoredMemory & { status?: string }))
    .filter((m) => m.status !== "archived");
}

/**
 * Apply a batch of model-emitted operations. Pinned memories are never
 * modified or archived by the AI. Returns counts for logging.
 */
export async function applyMemoryOps(
  teamId: string,
  huddleId: string,
  ops: MemoryOp[]
): Promise<{ added: number; updated: number; archived: number }> {
  let added = 0;
  let updated = 0;
  let archived = 0;
  const now = Date.now();

  for (const op of ops) {
    const scope: MemoryScope = op.scope === "team" ? "team" : "huddle";
    const col = memoryCollection(teamId, huddleId, scope);

    if (op.op === "add" && op.key && op.value) {
      await col.add({
        key: op.key,
        value: op.value,
        category: normalizeCategory(op.category),
        source: scope === "team" ? "auto-extracted (team)" : "auto-extracted",
        status: "active",
        pinned: false,
        createdAt: now,
        updatedAt: now,
        lastConfirmedAt: now,
      });
      added++;
    } else if (op.op === "update" && op.id) {
      const ref = col.doc(op.id);
      const cur = await ref.get();
      if (!cur.exists || cur.data()?.pinned) continue; // never touch pinned
      const patch: Record<string, unknown> = {
        updatedAt: now,
        lastConfirmedAt: now,
      };
      if (op.key) patch.key = op.key;
      if (op.value) patch.value = op.value;
      if (op.category) patch.category = normalizeCategory(op.category);
      await ref.update(patch);
      updated++;
    } else if (op.op === "archive" && op.id) {
      const ref = col.doc(op.id);
      const cur = await ref.get();
      if (!cur.exists || cur.data()?.pinned) continue; // never archive pinned
      await ref.update({ status: "archived", updatedAt: now });
      archived++;
    }
  }

  return { added, updated, archived };
}

/** Render active memories compactly for a model prompt (with ids for update/archive). */
export function renderMemoriesForPrompt(memories: StoredMemory[]): string {
  if (memories.length === 0) return "(none yet)";
  return memories
    .map(
      (m) =>
        `- [id:${m.id}]${m.pinned ? " [PINNED]" : ""} (${
          m.category || "Other"
        }) ${m.key}: ${m.value}`
    )
    .join("\n");
}

const CONSOLIDATE_PROMPT = `You are tidying a team's shared memory so it stays a clean, current, de-duplicated knowledge base. You are given the current memories (each with an id). Produce cleanup operations AND a human-readable summary.

Return ONLY valid JSON:
{
  "operations": [
    {"op":"update","id":"<id>","key":"short label","value":"best combined wording","category":"<category>"},
    {"op":"archive","id":"<id>"}
  ],
  "summary": "<markdown>"
}

Rules:
- Merge near-duplicates: keep ONE memory (update it to the clearest combined wording) and "archive" the redundant ones.
- "archive" facts that are stale, obsolete, or superseded by a newer one.
- NEVER archive or modify a memory marked [PINNED]; reflect it in the summary unchanged.
- Do NOT invent new facts — only reorganize what is given.
- Allowed categories: Decision, Person, Project, Terminology, Action item, Preference, Other.
- "summary": concise markdown for humans, grouped under the relevant category headings, short bullet points. Omit empty categories. If there are no memories, use a short friendly note.
- If nothing needs changing, return an empty operations array but still produce the summary.`;

function summaryRef(teamId: string, huddleId: string, scope: MemoryScope) {
  const db = getAdminDb();
  return scope === "team"
    ? db.collection("teams").doc(teamId).collection("memoryMeta").doc("summary")
    : db
        .collection("teams")
        .doc(teamId)
        .collection("huddles")
        .doc(huddleId)
        .collection("memoryMeta")
        .doc("summary");
}

function parseConsolidation(text: string): {
  operations: MemoryOp[];
  summary: string;
} {
  const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    return {
      operations: Array.isArray(parsed.operations) ? parsed.operations : [],
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
    };
  } catch {
    console.error("Failed to parse consolidation result:", text);
    return { operations: [], summary: "" };
  }
}

/**
 * Merge near-duplicates, archive stale memories, and regenerate the human
 * summary for one scope. Shared by the manual "Tidy up" endpoint and the
 * automatic threshold trigger.
 */
export async function consolidateScope(
  teamId: string,
  huddleId: string,
  scope: MemoryScope
): Promise<{ added: number; updated: number; archived: number; summarized: boolean }> {
  const memories = await fetchActiveMemories(teamId, huddleId, scope);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: CONSOLIDATE_PROMPT,
    messages: [
      {
        role: "user",
        content: `Current memories:\n${renderMemoriesForPrompt(memories)}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const { operations, summary } = parseConsolidation(text);

  const scopedOps: MemoryOp[] = operations.map((op) => ({ ...op, scope }));
  const result = await applyMemoryOps(teamId, huddleId, scopedOps);

  await summaryRef(teamId, huddleId, scope).set({
    text: summary,
    updatedAt: Date.now(),
  });

  return { ...result, summarized: !!summary };
}
