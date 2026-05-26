import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Fallback for local development, priority for environment variables in production (Vercel)
const configs = import.meta.glob('../../firebase-applet-config.json', { eager: true });
const localConfig = (Object.values(configs)[0] as any)?.default || {};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || localConfig.apiKey || "placeholder",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || localConfig.authDomain || "placeholder",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || localConfig.projectId || "placeholder",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || localConfig.storageBucket || "placeholder",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || localConfig.messagingSenderId || "placeholder",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || localConfig.appId || "placeholder",
};

const app = initializeApp(firebaseConfig);

// Debug warning for unconfigured deployments
if (firebaseConfig.apiKey === "placeholder") {
  console.error("CRITICAL: Firebase is not configured. Please set identity environment variables (VITE_FIREBASE_API_KEY, etc.) or ensure firebase-applet-config.json is present in the root.");
}

export const auth = getAuth(app);
export const db = getFirestore(app, (import.meta.env.VITE_FIRESTORE_DATABASE_ID || localConfig.firestoreDatabaseId));
