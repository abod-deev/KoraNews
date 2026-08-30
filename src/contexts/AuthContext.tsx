import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithPopup,
  signInWithCustomToken,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';

interface AuthContextType {
  user: any;
  loading: boolean;
  token: string | null;
  signInWithGoogle: () => Promise<void>;
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
  signInWithGoogle: async () => {},
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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Helper to persist session
  const saveSession = (sessionToken: string, userObj: any) => {
    localStorage.setItem('srv_session_token', sessionToken);
    localStorage.setItem('srv_session_user', JSON.stringify(userObj));
    setToken(sessionToken);
    setUser(userObj);
  };

  // On mount restore local session first
  useEffect(() => {
    const savedToken = localStorage.getItem('srv_session_token');
    const savedUser = localStorage.getItem('srv_session_user');
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
              // If completely unrecoverable, clear invalid tokens
              localStorage.removeItem('srv_session_token');
              localStorage.removeItem('srv_session_user');
              setToken(null);
              setUser(null);
              return null;
            }
            return res.ok ? res.json() : null;
          })
          .then((data) => {
            if (data) {
              const merged = { ...parsed, ...data };
              setUser(merged);
              localStorage.setItem('srv_session_user', JSON.stringify(merged));
            }
          })
          .catch(() => {});
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (currentUser) {
          try {
            const idToken = await currentUser.getIdToken();
            // Sync user with backend to ensure DB user & session are up-to-date
            const syncRes = await fetch('/api/auth/sync', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${idToken}`
              }
            });
            if (syncRes.ok) {
              const syncData = await syncRes.json();
              if (syncData.sessionToken && syncData.user) {
                saveSession(syncData.sessionToken, syncData.user);
              }
            }
          } catch (error) {
            console.error("Failed to sync user with backend:", error);
          }
        } else {
          const savedToken = localStorage.getItem('srv_session_token');
          const savedUser = localStorage.getItem('srv_session_user');
          if (savedToken && savedUser) {
            try {
              const parsed = JSON.parse(savedUser);
              setUser(parsed);
              setToken(savedToken);
            } catch (e) {
              setUser(null);
              setToken(null);
            }
          } else {
            setUser(null);
            setToken(null);
          }
        }
        setLoading(false);
      },
      (error) => {
        const msg = error?.message || String(error);
        if (msg.includes('Database is closing') || msg.includes('closing') || msg.includes('hidden') || msg.includes('indexedDB')) {
          console.warn('[Auth] Handled background persistence state:', msg);
        } else {
          console.warn('[Auth] Auth state error:', msg);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      if (result?.user) {
        const idToken = await result.user.getIdToken();
        const syncRes = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          if (syncData.sessionToken && syncData.user) {
            saveSession(syncData.sessionToken, syncData.user);
          }
        }
      }
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      if (error?.code === 'auth/popup-blocked') {
        throw new Error('تم حظر النافذة المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة والمحاولة مرة أخرى.');
      } else if (error?.code === 'auth/popup-closed-by-user') {
        throw new Error('تم إغلاق نافذة تسجيل الدخول من قبل المستخدم.');
      }
      throw new Error(error.message || 'حدث خطأ في تسجيل الدخول بواسطة جوجل');
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
    let currentToken = token || localStorage.getItem('srv_session_token');
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
      localStorage.setItem('srv_session_user', JSON.stringify(updated));
    }
    return data.user;
  };

  const deleteAccount = async () => {
    const currentToken = token || localStorage.getItem('srv_session_token');
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
    await logout();
  };

  const logout = async () => {
    localStorage.removeItem('srv_session_token');
    localStorage.removeItem('srv_session_user');
    setUser(null);
    setToken(null);
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
