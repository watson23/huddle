import { getAdminDb } from "./firebase-admin";

/**
 * Atomically claim a one-shot AI action for a given trigger.
 *
 * In a multi-member huddle, every online client independently runs the
 * evaluation/memory timers, so without coordination N clients would each fire
 * the AI (duplicate messages, duplicate memories). This serializes them: the
 * trigger is identified by a `token` (the id of the latest message at trigger
 * time), and only the first caller to claim that token proceeds.
 *
 * Returns true if THIS caller won the claim, false if another client already
 * handled this exact trigger (or on contention — we fail closed to avoid dupes).
 */
export async function claimAITurn(
  teamId: string,
  huddleId: string,
  lockId: "eval" | "memory",
  token: string
): Promise<boolean> {
  const db = getAdminDb();
  const ref = db
    .collection("teams")
    .doc(teamId)
    .collection("huddles")
    .doc(huddleId)
    .collection("locks")
    .doc(lockId);

  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists && snap.data()?.token === token) {
        return false; // this trigger was already handled by another client
      }
      tx.set(ref, { token, updatedAt: Date.now() });
      return true;
    });
  } catch {
    // Fail closed: skipping a turn is far better than posting a duplicate.
    return false;
  }
}
