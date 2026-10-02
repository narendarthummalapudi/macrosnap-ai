"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAuthStateChanged = exports.getDocs = exports.onSnapshot = exports.orderBy = exports.query = exports.collection = exports.deleteDoc = exports.setDoc = exports.getDoc = exports.doc = exports.OperationType = exports.googleProvider = exports.auth = exports.db = void 0;
exports.handleFirestoreError = handleFirestoreError;
exports.testConnection = testConnection;
exports.signInGuest = signInGuest;
exports.signInWithGoogle = signInWithGoogle;
exports.signInWithToken = signInWithToken;
exports.signOutUser = signOutUser;
const app_1 = require("firebase/app");
const auth_1 = require("firebase/auth");
Object.defineProperty(exports, "onAuthStateChanged", { enumerable: true, get: function () { return auth_1.onAuthStateChanged; } });
const firestore_1 = require("firebase/firestore");
Object.defineProperty(exports, "doc", { enumerable: true, get: function () { return firestore_1.doc; } });
Object.defineProperty(exports, "getDoc", { enumerable: true, get: function () { return firestore_1.getDoc; } });
Object.defineProperty(exports, "collection", { enumerable: true, get: function () { return firestore_1.collection; } });
Object.defineProperty(exports, "query", { enumerable: true, get: function () { return firestore_1.query; } });
Object.defineProperty(exports, "orderBy", { enumerable: true, get: function () { return firestore_1.orderBy; } });
Object.defineProperty(exports, "onSnapshot", { enumerable: true, get: function () { return firestore_1.onSnapshot; } });
Object.defineProperty(exports, "setDoc", { enumerable: true, get: function () { return firestore_1.setDoc; } });
Object.defineProperty(exports, "deleteDoc", { enumerable: true, get: function () { return firestore_1.deleteDoc; } });
Object.defineProperty(exports, "getDocs", { enumerable: true, get: function () { return firestore_1.getDocs; } });
const firebase_applet_config_json_1 = __importDefault(require("../../firebase-applet-config.json"));
const app = (0, app_1.getApps)().length === 0 ? (0, app_1.initializeApp)(firebase_applet_config_json_1.default) : (0, app_1.getApp)();
exports.db = (0, firestore_1.getFirestore)(app);
exports.auth = (0, auth_1.getAuth)(app);
exports.googleProvider = new auth_1.GoogleAuthProvider();
console.log('[Firebase Init] Firestore db initialized:', {
    projectId: firebase_applet_config_json_1.default.projectId,
    firestoreDatabaseId: '(default)',
    appOptions: app.options,
});
var OperationType;
(function (OperationType) {
    OperationType["CREATE"] = "create";
    OperationType["UPDATE"] = "update";
    OperationType["DELETE"] = "delete";
    OperationType["LIST"] = "list";
    OperationType["GET"] = "get";
    OperationType["WRITE"] = "write";
})(OperationType || (exports.OperationType = OperationType = {}));
function handleFirestoreError(error, operationType, path) {
    const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        authInfo: {
            userId: exports.auth.currentUser?.uid,
            email: exports.auth.currentUser?.email,
            emailVerified: exports.auth.currentUser?.emailVerified,
            isAnonymous: exports.auth.currentUser?.isAnonymous,
            tenantId: exports.auth.currentUser?.tenantId,
            providerInfo: exports.auth.currentUser?.providerData?.map((provider) => ({
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
async function testConnection() {
    if (!(0, app_1.getApps)().length) {
        console.warn('Firebase configuration is invalid');
        return { success: false, message: 'Firebase configuration is invalid' };
    }
    console.log('Firebase initialized: true');
    console.log('Auth initialized: true');
    console.log('Firestore initialized: true');
    const uid = exports.auth.currentUser?.uid || null;
    if (!uid) {
        console.log('User is not authenticated');
        return { success: false, message: 'User is not authenticated' };
    }
    const testDocRef = (0, firestore_1.doc)(exports.db, 'users', uid, 'meals', 'test');
    try {
        // 1. Test Create
        await (0, firestore_1.setDoc)(testDocRef, { testContent: true, createdAt: new Date().toISOString() });
        // 2. Test Read
        const docSnap = await (0, firestore_1.getDocFromServer)(testDocRef);
        if (!docSnap.exists()) {
            throw new Error("Created document was not found on read-back");
        }
        // 3. Test Delete
        await (0, firestore_1.deleteDoc)(testDocRef);
        console.log('Firebase initialized successfully');
        return { success: true, message: 'Firebase initialized successfully' };
    }
    catch (error) {
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
async function signInGuest() {
    try {
        const result = await (0, auth_1.signInAnonymously)(exports.auth);
        return result.user;
    }
    catch (err) {
        console.warn('Anonymous sign-in not available or failed:', err);
        return null;
    }
}
async function signInWithGoogle() {
    try {
        const result = await (0, auth_1.signInWithPopup)(exports.auth, exports.googleProvider);
        return result.user;
    }
    catch (err) {
        const errMsg = err?.code || err?.message || String(err);
        if (errMsg.includes('auth/unauthorized-domain') || errMsg.includes('unauthorized-domain')) {
            console.warn(`[Firebase Auth] Domain '${typeof window !== 'undefined' ? window.location.hostname : ''}' is not in Firebase Authorized Domains list. (Firebase Console -> Authentication -> Settings -> Authorized Domains).`);
        }
        else {
            console.error('Sign-in error:', err);
        }
        throw err;
    }
}
async function signInWithToken(token) {
    try {
        const result = await (0, auth_1.signInWithCustomToken)(exports.auth, token);
        return result.user;
    }
    catch (err) {
        console.error('Sign-in with Custom Token error:', err);
        throw err;
    }
}
async function signOutUser() {
    try {
        await (0, auth_1.signOut)(exports.auth);
    }
    catch (err) {
        console.error('Sign-out error:', err);
        throw err;
    }
}
