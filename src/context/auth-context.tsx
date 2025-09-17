
'use client';

import * as React from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut, 
  type User,
  getAuth,
  type Auth
} from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<any>;
  signUp: (email: string, pass: string) => Promise<any>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, app }: { children: React.ReactNode, app: FirebaseApp | null }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [authInstance, setAuthInstance] = React.useState<Auth | null>(null);

  React.useEffect(() => {
    if (app) {
      const auth = getAuth(app);
      setAuthInstance(auth);
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(true);
    }
  }, [app]);

  const ensureAuthReady = () => {
    if (!authInstance) {
      return Promise.reject(new Error("Firebase Auth is not initialized yet."));
    }
    return Promise.resolve(authInstance);
  };

  const signIn = async (email: string, pass: string) => {
    const auth = await ensureAuthReady();
    return signInWithEmailAndPassword(auth, email, pass);
  };
  
  const signUp = async (email: string, pass: string) => {
    const auth = await ensureAuthReady();
    return createUserWithEmailAndPassword(auth, email, pass);
  };
  
  const sendPasswordReset = async (email: string) => {
    const auth = await ensureAuthReady();
    return sendPasswordResetEmail(auth, email);
  }

  const handleSignOut = async () => {
    const auth = await ensureAuthReady();
    return signOut(auth);
  };
  
  const value = {
    user,
    loading,
    signIn,
    signUp,
    sendPasswordReset,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
