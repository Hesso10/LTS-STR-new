import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase-konfiguraatio
 * Huom: Nämä ovat julkisia tunnuksia, jotka on suojattu Firestore Rules -säännöillä.
 */
const firebaseConfig = {
  projectId: "superb-firefly-489705-g3",
  appId: "1:16978149266:web:41987cbf5121df8db18b4b",
  apiKey: "AIzaSyB9pQvDsOdmI5UFvIKlABYz1Ulap0UbJfc",
  authDomain: "superb-firefly-489705-g3.firebaseapp.com",
  storageBucket: "superb-firefly-489705-g3.firebasestorage.app",
  messagingSenderId: "16978149266",
  measurementId: "G-LYM92JJCR6"
};

// Alusta Firebase-sovellus
const app = initializeApp(firebaseConfig);

// Eksportoi palvelut muiden komponenttien käyttöön
export const db = getFirestore(app);
export const auth = getAuth(app);

/**
 * Tietotyypit Firestore-operaatioille ja virheen käsittelyyn
 */
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    providerInfo: any[];
  }
}

/**
 * Yleinen virheidenkäsittelijä Firestore-kutsuille
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      providerInfo: auth.currentUser?.providerData.map(p => ({
        providerId: p.providerId,
        displayName: p.displayName,
        email: p.email,
        photoUrl: p.photoURL
      })) || []
    },
    operationType,
    path
  };
  
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
