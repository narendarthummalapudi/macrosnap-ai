import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCustomToken,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  query,
  orderBy,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

console.log('[Firebase Init] Firestore db initialized:', {
  projectId: firebaseConfig.projectId,
  firestoreDatabaseId: '(default)',
  appOptions: app.options,
});

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
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test initial connection as required by specification
export async function testConnection() {
  const projectId = firebaseConfig.projectId;
  const databaseId = '(default)';
  const uid = auth.currentUser?.uid || null;
  const testPath = 'test/connection';

  console.log('[Firestore testConnection] Starting connection probe:', {
    projectId,
    databaseId,
    authenticatedUid: uid,
    testPath,
  });

  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firestore testConnection] SUCCESS: Connected to Firestore server.', {
      projectId,
      databaseId,
    });
  } catch (error: any) {
    const errorCode = error?.code || 'unknown';
    const errorMessage = error?.message || String(error);

    console.log('[Firestore testConnection] Probe result:', {
      projectId,
      databaseId,
      authenticatedUid: uid,
      testPath,
      success: false,
      errorCode,
      errorMessage,
      note: errorCode === 'permission-denied'
        ? 'permission-denied on test/connection is normal if Firestore security rules reject root test collection'
        : undefined,
    });

    if (errorMessage.includes('the client is offline') && !navigator.onLine) {
      console.warn('[Firestore testConnection] Network connection appears offline.');
    }
  }
}

export async function signInGuest() {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (err) {
    console.warn('Anonymous sign-in not available or failed:', err);
    return null;
  }
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: any) {
    const errMsg = err?.code || err?.message || String(err);
    if (errMsg.includes('auth/unauthorized-domain') || errMsg.includes('unauthorized-domain')) {
      console.warn(
        `[Firebase Auth] Domain '${typeof window !== 'undefined' ? window.location.hostname : ''}' is not in Firebase Authorized Domains list. (Firebase Console -> Authentication -> Settings -> Authorized Domains).`
      );
    } else {
      console.error('Sign-in error:', err);
    }
    throw err;
  }
}

export async function signInWithToken(token: string) {
  try {
    const result = await signInWithCustomToken(auth, token);
    return result.user;
  } catch (err) {
    console.error('Sign-in with Custom Token error:', err);
    throw err;
  }
}

export async function signOutUser() {
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.error('Sign-out error:', err);
    throw err;
  }
}

export {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  onAuthStateChanged
};
export type { FirebaseUser };
