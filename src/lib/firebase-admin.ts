import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

let _app: App | undefined;

function getApp(): App {
  if (getApps().length > 0) return getApps()[0];

  if (!_app) {
    _app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }

  return _app;
}

export function getAdminDb() {
  return getFirestore(getApp());
}

export function getAdminAuth() {
  return getAuth(getApp());
}

export function getAdminStorage() {
  return getStorage(getApp());
}
