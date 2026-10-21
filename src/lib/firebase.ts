import {
  type FirebaseApp,
  type FirebaseOptions,
  getApps,
  initializeApp,
} from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  ...(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    ? { authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }
    : {}),
  ...(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    ? { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }
    : {}),
  ...(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    ? { storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }
    : {}),
  ...(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    ? {
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      }
    : {}),
  ...(process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    ? { appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID }
    : {}),
  ...(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    ? { measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID }
    : {}),
};

// Prevent re-initialization during Next.js Hot Module Replacement (HMR)
const existingApps = getApps();
const existingApp = existingApps[0];

const app: FirebaseApp = existingApp ?? initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
