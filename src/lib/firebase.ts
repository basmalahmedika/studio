
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

function initializeFirebase(): FirebaseApp {
  if (typeof window !== "undefined") {
    if (getApps().length === 0) {
      if (!firebaseConfig.apiKey) {
        throw new Error("Firebase API key is not set. Please check your environment variables.");
      }
      return initializeApp(firebaseConfig);
    }
    return getApp();
  }
  // This is a server-side check, return a mock or handle as needed
  // For this app, we'll rely on the client-side initialization guard.
  return null as any;
}

export { initializeFirebase };
