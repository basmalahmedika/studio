
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyDbiJ8FtbYrM9PECDiixI_GfrpxGrzbIxM",
  authDomain: "apotekbasmalahv3.firebaseapp.com",
  databaseURL: "https://apotekbasmalahv3-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "apotekbasmalahv3",
  storageBucket: "apotekbasmalahv3.appspot.com",
  messagingSenderId: "902423755017",
  appId: "1:902423755017:web:b814c7fdc4b450bd8ebbd8",
  measurementId: "G-3CPKM1FLKP"
};

export function initializeFirebase(): FirebaseApp {
  if (getApps().length === 0) {
    if (!firebaseConfig.apiKey) {
      throw new Error("Firebase configuration is missing or incomplete.");
    }
    return initializeApp(firebaseConfig);
  }
  return getApp();
}
