import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

const DEV_USER_UID = "dev-test-user-001";
const DEV_USER_NAME = "Test User (Dev)";
const DEV_USER_EMAIL = "dev@huddle.test";

export async function POST() {
  // Hard block in production
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  try {
    // Ensure the test user exists in Firebase Auth
    try {
      await getAdminAuth().getUser(DEV_USER_UID);
    } catch {
      await getAdminAuth().createUser({
        uid: DEV_USER_UID,
        displayName: DEV_USER_NAME,
        email: DEV_USER_EMAIL,
      });
    }

    // Create a custom token
    const token = await getAdminAuth().createCustomToken(DEV_USER_UID);

    return NextResponse.json({ token, uid: DEV_USER_UID });
  } catch (err) {
    console.error("Dev auth error:", err);
    return NextResponse.json(
      { error: "Failed to create dev token" },
      { status: 500 }
    );
  }
}
