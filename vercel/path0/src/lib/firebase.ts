
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
  // This function ensures that we initialize Firebase only once, and only on the client-side.
  if (typeof window !== "undefined") {
    if (getApps().length === 0) {
      if (!firebaseConfig.apiKey) {
        // This error will be caught by the app, but helps in debugging.
        throw new Error("Firebase API key is not set. Please add it to your Vercel environment variables.");
      }
      return initializeApp(firebaseConfig);
    }
    return getApp();
  }
  // On the server, we return a null object to avoid initialization errors during build.
  // The actual Firebase services will only be called on the client.
  return null as any;
};

// Functions to get auth and firestore instances safely
const getFirebaseAuth = (): Auth => {
  return getAuth(getFirebaseApp());
};

const getFirestoreDb = (): Firestore => {
  return getFirestore(getFirebaseApp());
};


export { getFirebaseAuth, getFirestoreDb };
