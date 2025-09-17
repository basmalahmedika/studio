
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

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

function getFirebaseApp(): FirebaseApp {
  if (typeof window !== "undefined") {
    // Ensure this runs only on the client
    if (getApps().length === 0) {
      if (!firebaseConfig.apiKey) {
        console.error("Firebase API key is missing. Check Vercel environment variables.");
        // This will be caught by the app, but helps in debugging.
        throw new Error("Firebase API key is not set. Check your Vercel environment variables.");
      }
      return initializeApp(firebaseConfig);
    }
    return getApp();
  }
  // On the server, return a placeholder or handle as needed.
  // For this app, Firebase is only used client-side.
  return null as any;
};

// Functions to get auth and firestore instances
const getFirebaseAuth = (): Auth => {
  return getAuth(getFirebaseApp());
};

const getFirestoreDb = (): Firestore => {
  return getFirestore(getFirebaseApp());
};


export { getFirebaseAuth, getFirestoreDb };
