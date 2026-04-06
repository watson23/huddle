import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { ClaudeProvider } from "@/lib/ai/claude";
import type { Message, Memory, AIPresence } from "@/types";

const SYSTEM_PROMPTS: Record<AIPresence, string> = {
  off: "",
  "on-demand": `You are Huddle AI, an assistant participating in a group conversation. You were directly mentioned or asked to respond.

Be helpful, concise, and natural. You're one participant among several humans — don't dominate the conversation. Address the group, not just one person. Reference previous context and memories when relevant.

Keep responses focused and under 200 words unless the question requires more detail.`,

  active: `You are Huddle AI, actively participating in a group conversation. You can contribute proactively when you have something valuable to add.

Be helpful but restrained. Only speak when you have something substantively useful — a relevant fact, a clarification, a suggestion, or a synthesis of the discussion. Never just acknowledge or agree without adding value.

Keep responses brief (under 150 words). You're a collaborator, not the main speaker.`,
};

export async function POST(req: NextRequest) {
  const { teamId, huddleId, threadId, aiPresence } = await req.json();

  if (!teamId || !huddleId || aiPresence === "off") {
    return new Response("Bad request", { status: 400 });
  }

  // Fetch recent messages
  const messagesRef = getAdminDb()
    .collection("teams")
    .doc(teamId)
    .collection("huddles")
    .doc(huddleId)
    .collection("messages");

  let msgQuery = messagesRef.orderBy("createdAt", "desc").limit(50);
  if (threadId) {
    msgQuery = messagesRef
      .where("threadId", "==", threadId)
      .orderBy("createdAt", "desc")
      .limit(50);
  }

  const msgSnap = await msgQuery.get();
  const messages: Message[] = msgSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Message))
    .reverse();

  // Fetch memories
  const huddleMemSnap = await getAdminDb()
    .collection("teams")
    .doc(teamId)
    .collection("huddles")
    .doc(huddleId)
    .collection("memory")
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();

  const teamMemSnap = await getAdminDb()
    .collection("teams")
    .doc(teamId)
    .collection("memory")
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();

  const memories: Memory[] = [
    ...huddleMemSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Memory)),
    ...teamMemSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Memory)),
  ];

  const provider = new ClaudeProvider();
  const stream = provider.generateResponse({
    systemPrompt: SYSTEM_PROMPTS[aiPresence as AIPresence],
    messages,
    memories,
  });

  // Stream the response
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        console.error("AI stream error:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
