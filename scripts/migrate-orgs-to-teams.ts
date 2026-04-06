import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local from project root
config({ path: resolve(__dirname, "../.env.local") });

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore(app);

async function copySubcollection(
  srcPath: string,
  destPath: string,
  fieldRenames?: Record<string, string>
) {
  const snap = await db.collection(srcPath).get();
  let count = 0;
  for (const doc of snap.docs) {
    const data = { ...doc.data() };
    // Rename fields if specified
    if (fieldRenames) {
      for (const [oldKey, newKey] of Object.entries(fieldRenames)) {
        if (oldKey in data) {
          data[newKey] = data[oldKey];
          delete data[oldKey];
        }
      }
    }
    await db.collection(destPath).doc(doc.id).set(data);
    count++;
  }
  return count;
}

async function migrate() {
  console.log("Starting migration: orgs → teams, rooms → huddles\n");

  // Get all orgs
  const orgsSnap = await db.collection("orgs").get();
  console.log(`Found ${orgsSnap.size} organization(s) to migrate\n`);

  for (const orgDoc of orgsSnap.docs) {
    const orgData = orgDoc.data();
    const orgId = orgDoc.id;

    // Copy org → team (same doc ID)
    await db.collection("teams").doc(orgId).set(orgData);
    console.log(`✓ Migrated org "${orgData.name}" → team (ID: ${orgId})`);

    // Copy org-level memories
    const orgMemCount = await copySubcollection(
      `orgs/${orgId}/memory`,
      `teams/${orgId}/memory`
    );
    if (orgMemCount > 0) console.log(`  └ ${orgMemCount} org memories`);

    // Copy org-level presence
    const presenceCount = await copySubcollection(
      `orgs/${orgId}/presence`,
      `teams/${orgId}/presence`
    );
    if (presenceCount > 0) console.log(`  └ ${presenceCount} presence entries`);

    // Get all rooms in this org
    const roomsSnap = await db.collection(`orgs/${orgId}/rooms`).get();
    console.log(`  └ ${roomsSnap.size} room(s) to migrate`);

    for (const roomDoc of roomsSnap.docs) {
      const roomData = { ...roomDoc.data() };
      const roomId = roomDoc.id;

      // Rename orgId → teamId in room data
      if ("orgId" in roomData) {
        roomData.teamId = roomData.orgId;
        delete roomData.orgId;
      }

      // Copy room → huddle
      await db
        .collection(`teams/${orgId}/huddles`)
        .doc(roomId)
        .set(roomData);
      console.log(`    ✓ Room "${roomData.name}" → huddle (ID: ${roomId})`);

      // Copy messages (rename roomId → huddleId)
      const msgCount = await copySubcollection(
        `orgs/${orgId}/rooms/${roomId}/messages`,
        `teams/${orgId}/huddles/${roomId}/messages`,
        { roomId: "huddleId" }
      );
      if (msgCount > 0) console.log(`      └ ${msgCount} messages`);

      // Copy room memories
      const memCount = await copySubcollection(
        `orgs/${orgId}/rooms/${roomId}/memory`,
        `teams/${orgId}/huddles/${roomId}/memory`
      );
      if (memCount > 0) console.log(`      └ ${memCount} memories`);

      // Copy room files (rename roomId → huddleId)
      const fileCount = await copySubcollection(
        `orgs/${orgId}/rooms/${roomId}/files`,
        `teams/${orgId}/huddles/${roomId}/files`,
        { roomId: "huddleId" }
      );
      if (fileCount > 0) console.log(`      └ ${fileCount} files`);
    }

    console.log();
  }

  console.log("Migration complete! Old 'orgs' collection is preserved.");
  console.log("Delete it manually from Firebase Console when satisfied.\n");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
