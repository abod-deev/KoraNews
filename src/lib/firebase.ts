import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let authInstance;
try {
  authInstance = getAuth(app);
} catch (e) {
  try {
    authInstance = initializeAuth(app, {
      persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence]
    });
  } catch (err) {
    authInstance = getAuth(app);
  }
}

export const auth = authInstance;
export const googleAuthProvider = new GoogleAuthProvider();
