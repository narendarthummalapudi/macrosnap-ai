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
import firebaseConfig from '../../firebase-applet-config.json';

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

// Main diagnostic procedure requested for environment validation
export async function testConnection() {
  if (!getApps().length) {
    console.warn('Firebase configuration is invalid');
    return { success: false, message: 'Firebase configuration is invalid' };
  }

  console.log('Firebase initialized: true');
  console.log('Auth initialized: true');
  console.log('Firestore initialized: true');

  const uid = auth.currentUser?.uid || null;
  if (!uid) {
    console.log('User is not authenticated');
    return { success: false, message: 'User is not authenticated' };
  }

  const testDocRef = doc(db, 'users', uid, 'meals', 'test');

  try {
    // 1. Test Create
    await setDoc(testDocRef, { testContent: true, createdAt: new Date().toISOString() });

    // 2. Test Read
    const docSnap = await getDocFromServer(testDocRef);
    if (!docSnap.exists()) {
      throw new Error("Created document was not found on read-back");
    }

    // 3. Test Delete
    await deleteDoc(testDocRef);

    console.log('Firebase initialized successfully');
    return { success: true, message: 'Firebase initialized successfully' };
  } catch (error: any) {
    const errorCode = error?.code || 'unknown';
    const errorMessage = error?.message || String(error);

    let diagnosticMessage = "Firestore database unavailable";
    if (errorCode === 'permission-denied') {
      diagnosticMessage = "Firestore permission denied";
    }

    console.error(`[Firebase Test Error] ${diagnosticMessage}`, errorMessage);
    return { success: false, message: diagnosticMessage };
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
