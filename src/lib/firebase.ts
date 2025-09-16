
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
