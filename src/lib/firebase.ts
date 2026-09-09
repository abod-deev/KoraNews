import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  Auth,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp | undefined;
let authInstance: Auth | null = null;

try {
  if (getApps().length > 0) {
    app = getApp();
  } else if (firebaseConfig && firebaseConfig.projectId) {
    app = initializeApp(firebaseConfig);
  }
} catch (err) {
  console.warn('[Firebase App] Failed to initialize app:', err);
}

if (app) {
  try {
    // initializeAuth takes AuthSettings with persistence array and popupRedirectResolver
    authInstance = initializeAuth(app, {
      persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    try {
      authInstance = getAuth(app);
    } catch (err) {
      console.warn('[Firebase Auth] Failed to retrieve initialized auth:', err);
      authInstance = null;
    }
  }
}

export const auth = authInstance;
export const googleAuthProvider = new GoogleAuthProvider();
export { browserPopupRedirectResolver };

