import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let authInstance: any;
try {
  // Always initializeAuth FIRST with browserLocalPersistence and browserPopupRedirectResolver
  // to avoid indexedDBLocalPersistence teardown errors while ensuring popup auth works seamlessly.
  authInstance = initializeAuth(app, {
    persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
} catch {
  // Fallback if already initialized
  try {
    authInstance = getAuth(app);
  } catch (err) {
    console.warn('[Firebase Auth] Failed to retrieve initialized auth:', err);
  }
}

export const auth = authInstance;
export const googleAuthProvider = new GoogleAuthProvider();
export { browserPopupRedirectResolver };
