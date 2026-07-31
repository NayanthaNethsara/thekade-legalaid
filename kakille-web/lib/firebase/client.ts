"use client";

import { getApps, initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup } from "firebase/auth";

// Firebase web config is public by design (security comes from the backend
// verifying ID tokens against the project), so NEXT_PUBLIC_* is fine here.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function firebaseApp() {
  return getApps()[0] ?? initializeApp(firebaseConfig);
}

/**
 * Run the Google sign-in popup and return the Firebase ID token, which the
 * backend exchanges for its own session tokens. Returns null when the user
 * closes the popup.
 */
export async function signInWithGoogle(): Promise<string | null> {
  const auth = getAuth(firebaseApp());
  try {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    return result.user.getIdToken();
  } catch {
    return null;
  }
}
