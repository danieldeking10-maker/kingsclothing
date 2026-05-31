import { initializeApp, setLogLevel } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

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
