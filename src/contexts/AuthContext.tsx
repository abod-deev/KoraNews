import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithPopup,
  signInWithCustomToken,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth, browserPopupRedirectResolver } from '../lib/firebase';
import { AuthUser } from '../utils/authHelpers';
import { safeStorage } from '../utils/safeStorage';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  token: string | null;
  signInWithGoogle: () => Promise<boolean>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  sendVerificationCode: (email: string, pass: string, name?: string) => Promise<{ success: boolean; message: string; email: string; devCode?: string }>;
  verifyCodeAndSignUp: (email: string, code: string) => Promise<void>;
  resendVerificationCode: (email: string) => Promise<{ success: boolean; message: string; devCode?: string }>;
  updateUserProfile: (name: string, avatar: string | null) => Promise<any>;
  deleteAccount: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  token: null,
  signInWithGoogle: async () => false,
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  sendVerificationCode: async () => ({ success: false, message: '', email: '' }),
  verifyCodeAndSignUp: async () => {},
  resendVerificationCode: async () => ({ success: false, message: '' }),
  updateUserProfile: async () => {},
  deleteAccount: async () => {},
  logout: async () => {},
});

function extractErrorMessage(data: any, fallback: string): string {
  if (typeof data?.error === 'string') return data.error;
  if (typeof data?.message === 'string') return data.message;
  if (typeof data?.error?.message === 'string') return data.error.message;
  return fallback;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Helper to persist session safely
  const saveSession = (sessionToken: string, userObj: any) => {
    safeStorage.setItem('srv_session_token', sessionToken);
    safeStorage.setItem('srv_session_user', JSON.stringify(userObj));
    setToken(sessionToken);
    setUser(userObj);
  };

  const clearSession = () => {
    safeStorage.removeItem('srv_session_token');
    safeStorage.removeItem('srv_session_user');
    setToken(null);
    setUser(null);
  };

  // Hard safety guarantee: Ensure loading never stalls longer than 2.5s under any condition
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 2500);
    return () => clearTimeout(safetyTimer);
  }, []);

  // Restore local session on mount and verify profile in background
  useEffect(() => {
    const savedToken = safeStorage.getItem('srv_session_token');
    const savedUser = safeStorage.getItem('srv_session_user');

    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsed);

        // Verify/Refresh profile in background
        fetch('/api/user/profile', {
          headers: { Authorization: `Bearer ${savedToken}` }
        })
          .then(async (res) => {
            if (res.status === 401) {
              // Try auto-refresh via Firebase if Firebase user is active
              if (auth && auth.currentUser) {
                try {
                  const idToken = await auth.currentUser.getIdToken(true);
                  const syncRes = await fetch('/api/auth/sync', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${idToken}` }
                  });
                  if (syncRes.ok) {
                    const syncData = await syncRes.json();
                    if (syncData.sessionToken && syncData.user) {
                      saveSession(syncData.sessionToken, syncData.user);
                      return syncData.user;
                    }
                  }
                } catch {
                  // ignore
                }
              }
              // If completely unrecoverable, clear invalid token
              clearSession();
              return null;
            }
            return res.ok ? res.json() : null;
          })
          .then((data) => {
            if (data) {
              const merged = { ...parsed, ...data };
              setUser(merged);
              safeStorage.setItem('srv_session_user', JSON.stringify(merged));
            }
          })
          .catch(() => {})
          .finally(() => {
            setLoading(false);
          });
      } catch (e) {
        clearSession();
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // Firebase auth state listener
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    let isSubscribed = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!isSubscribed) return;
        try {
          if (currentUser) {
            const idToken = await currentUser.getIdToken();
            const syncRes = await fetch('/api/auth/sync', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${idToken}`
              }
            });
            if (syncRes.ok) {
              const syncData = await syncRes.json();
              if (syncData.sessionToken && syncData.user && isSubscribed) {
                saveSession(syncData.sessionToken, syncData.user);
              }
            }
          }
        } catch (error) {
          console.error("Failed to sync user with backend:", error);
        } finally {
          if (isSubscribed) {
            setLoading(false);
          }
        }
      },
      (error) => {
        const msg = error?.message || String(error);
        if (msg.includes('Database is closing') || msg.includes('closing') || msg.includes('hidden') || msg.includes('indexedDB')) {
          console.warn('[Auth] Handled background persistence state:', msg);
        } else {
          console.warn('[Auth] Auth state error:', msg);
        }
        if (isSubscribed) {
          setLoading(false);
        }
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async (): Promise<boolean> => {
    if (!auth) {
      throw new Error('خدمة مصادقة جوجل غير متوفرة حالياً، يرجى المحاولة لاحقاً أو استخدام البريد الإلكتروني.');
    }
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account',
      });
      const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      if (result?.user) {
        const idToken = await result.user.getIdToken();
        const syncRes = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            uid: result.user.uid,
            email: result.user.email,
            name: result.user.displayName,
            picture: result.user.photoURL,
          }),
        });

        const text = await syncRes.text();
        let syncData: any = {};
        try {
          syncData = JSON.parse(text);
        } catch {
          syncData = { error: text || 'حدث خطأ في مزامنة بيانات حساب جوجل' };
        }

        if (!syncRes.ok) {
          throw new Error(extractErrorMessage(syncData, 'فشل في مزامنة بيانات حساب جوجل مع الخادم'));
        }

        if (syncData.sessionToken && syncData.user) {
          saveSession(syncData.sessionToken, syncData.user);
        }
        return true;
      }
      return false;
    } catch (error: any) {
      const errorCode = error?.code || '';
      const errorMessage = error?.message || '';
      const isCancellation =
        errorCode === 'auth/popup-closed-by-user' ||
        errorCode === 'auth/cancelled-popup-request' ||
        errorMessage.includes('popup-closed-by-user') ||
        errorMessage.includes('cancelled-popup-request');

      if (isCancellation) {
        // User closed the popup window before finishing sign-in - expected user action, do not log as error
        console.info('Google Sign-In was dismissed or closed by the user.');
        return false;
      }

      console.error('Error signing in with Google:', error);
      if (errorCode === 'auth/popup-blocked') {
        throw new Error('تم حظر النافذة المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة (Popups) وإعادة المحاولة.');
      } else if (errorCode === 'auth/unauthorized-domain') {
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
        throw new Error(`النطاق الحالي (${currentHost}) غير مدرج في النطاقات المصرح بها (Authorized Domains) في إعدادات Firebase Authentication. يرجى إضافته في Firebase Console.`);
      } else if (errorCode === 'auth/network-request-failed') {
        throw new Error('تعذر الاتصال بخدمة المصادقة، يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً.');
      } else if (errorCode === 'auth/configuration-not-found' || errorCode === 'auth/operation-not-allowed') {
        throw new Error('مُكّن تسجيل الدخول عبر Google غير مفعّل بعد في مشروع Firebase الخاص بك. يرجى فتح Firebase Console -> Authentication -> Sign-in method وتفعيل خيار Google.');
      }
      throw new Error(errorMessage || 'حدث خطأ في تسجيل الدخول بواسطة جوجل');
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    const res = await fetch(`/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    
    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text || 'حدث خطأ غير متوقع في الخادم' };
    }

    if (!res.ok) {
      throw new Error(extractErrorMessage(data, 'فشل تسجيل الدخول'));
    }

    if (data.sessionToken && data.user) {
      saveSession(data.sessionToken, data.user);
    }

    if (data.customToken) {
      try {
        await signInWithCustomToken(auth, data.customToken);
      } catch (err) {
        console.warn('Firebase client sign in warning:', err);
      }
    }
  };

  const sendVerificationCode = async (email: string, pass: string, name?: string) => {
    const res = await fetch(`/api/auth/send-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass, name })
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text || 'حدث خطأ غير متوقع في الخادم' };
    }

    if (!res.ok) {
      throw new Error(extractErrorMessage(data, 'فشل إرسال رمز التحقق'));
    }

    return data;
  };

  const verifyCodeAndSignUp = async (email: string, code: string) => {
    const res = await fetch(`/api/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text || 'حدث خطأ غير متوقع في الخادم' };
    }

    if (!res.ok) {
      throw new Error(extractErrorMessage(data, 'رمز التحقق غير صحيح'));
    }

    if (data.sessionToken && data.user) {
      saveSession(data.sessionToken, data.user);
    }

    if (data.customToken) {
      try {
        await signInWithCustomToken(auth, data.customToken);
      } catch (err) {
        console.warn('Firebase client sign in warning:', err);
      }
    }
  };

  const resendVerificationCode = async (email: string) => {
    const res = await fetch(`/api/auth/resend-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text || 'حدث خطأ غير متوقع في الخادم' };
    }

    if (!res.ok) {
      throw new Error(extractErrorMessage(data, 'فشل إعادة إرسال رمز التحقق'));
    }

    return data;
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    const data = await sendVerificationCode(email, pass, name);
    return data;
  };

  const updateUserProfile = async (name: string, avatar: string | null) => {
    let currentToken = token || safeStorage.getItem('srv_session_token');
    if (!currentToken) throw new Error('يرجى تسجيل الدخول أولاً');
    
    let res = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ name, avatar })
    });

    // If 401 Unauthorized, try refreshing via Firebase if active
    if (res.status === 401 && auth && auth.currentUser) {
      try {
        const idToken = await auth.currentUser.getIdToken(true);
        const syncRes = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}` }
        });
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          if (syncData.sessionToken) {
            currentToken = syncData.sessionToken;
            saveSession(syncData.sessionToken, syncData.user);
            res = await fetch('/api/user/profile', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
              },
              body: JSON.stringify({ name, avatar })
            });
          }
        }
      } catch (refreshErr) {
        console.warn('Auto refresh on profile update failed:', refreshErr);
      }
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) {
        logout();
        throw new Error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً');
      }
      throw new Error(data.error || 'فشل تحديث الملف الشخصي');
    }
    if (data.sessionToken && data.user) {
      saveSession(data.sessionToken, data.user);
    } else if (data.user) {
      const updated = { ...user, ...data.user };
      setUser(updated);
      safeStorage.setItem('srv_session_user', JSON.stringify(updated));
    }
    return data.user;
  };

  const deleteAccount = async () => {
    const currentToken = token || safeStorage.getItem('srv_session_token');
    if (!currentToken) throw new Error('يرجى تسجيل الدخول أولاً');
    const res = await fetch('/api/user/account', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${currentToken}`
      }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'فشل حذف الحساب');
    }
    try {
      if (auth && auth.currentUser) {
        await auth.currentUser.delete();
      }
    } catch (fbDelErr) {
      console.warn('Firebase user deletion notice:', fbDelErr);
    }
    await logout();
  };

  const logout = async () => {
    const currentToken = token || safeStorage.getItem('srv_session_token');
    if (currentToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      }).catch(() => {});
    }

    clearSession();
    try {
      if (auth && auth.currentUser) {
        await signOut(auth);
      }
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (msg.includes('Database is closing') || msg.includes('closing') || msg.includes('hidden') || msg.includes('indexedDB')) {
        console.warn('Firebase signout info:', msg);
      } else {
        console.warn('Sign out warning:', msg);
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      token,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      sendVerificationCode,
      verifyCodeAndSignUp,
      resendVerificationCode,
      updateUserProfile,
      deleteAccount,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
