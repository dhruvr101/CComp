import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "colicit.firebaseapp.com",
  projectId: "colicit",
  storageBucket: "colicit.appspot.com",
  messagingSenderId: "29303607493",
  appId: "1:29303607493:web:2694018ded7770196a20ac",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);