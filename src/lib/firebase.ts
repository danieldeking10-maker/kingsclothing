import { initializeApp, setLogLevel } from 'firebase/app';
import type { FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import fallbackFirebaseConfig from '@/firebase-applet-config.json';

type AppFirebaseConfig = FirebaseOptions & {
  firestoreDatabaseId?: string;
};

const envFirebaseConfig: AppFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
};

const hasEnvFirebaseConfig = Boolean(
  envFirebaseConfig.apiKey &&
  envFirebaseConfig.authDomain &&
  envFirebaseConfig.projectId &&
  envFirebaseConfig.appId
);

const firebaseConfig: AppFirebaseConfig = hasEnvFirebaseConfig
  ? envFirebaseConfig
  : fallbackFirebaseConfig;

// Disable chatty Firestore sync or clock-desync warning messages
setLogLevel('error');

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use default robust memory index caching to prevent iframe sandbox database persistence bugs
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Test connection as suggested in system instructions (deferred to prevent locking loader)
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection established.");
  } catch (error: any) {
    if (error.message?.includes('the client is offline')) {
      console.error("Firebase is offline. Check configuration.");
    }
  }
}

if (typeof window !== 'undefined') {
  setTimeout(testConnection, 2000);
}
