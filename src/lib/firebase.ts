
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

// This function initializes Firebase and should be called once in a top-level client component.
function initializeFirebase(): FirebaseApp {
  if (typeof window !== "undefined") {
    if (!getApps().length) {
      if (!firebaseConfig.apiKey) {
        throw new Error("Firebase API key is not set. Please check your environment variables.");
      }
      return initializeApp(firebaseConfig);
    }
    return getApp();
  }
  // This should ideally not be reached if called correctly inside a useEffect.
  // We'll throw an error to make it clear if it's used incorrectly.
  throw new Error("Firebase can only be initialized on the client side.");
}

// Export the instances directly. They will be undefined on the server
// and populated on the client after initialization.
export { initializeFirebase };
