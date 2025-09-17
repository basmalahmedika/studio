
'use client';

import * as React from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut, 
  type User
} from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Import the auth instance

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<any>;
  signUp: (email: string, pass: string) => Promise<any>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Ensure auth object is available before setting up the listener
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // If auth is not ready, we are still loading
      setLoading(true);
    }
  }, []);

  const ensureAuthReady = () => {
    if (!auth) {
      return Promise.reject(new Error("Firebase Auth is not initialized yet."));
    }
    return Promise.resolve(auth);
  };

  const signIn = async (email: string, pass: string) => {
    const authInstance = await ensureAuthReady();
    return signInWithEmailAndPassword(authInstance, email, pass);
  };
  
  const signUp = async (email: string, pass: string) => {
    const authInstance = await ensureAuthReady();
    return createUserWithEmailAndPassword(authInstance, email, pass);
  };
  
  const sendPasswordReset = async (email: string) => {
    const authInstance = await ensureAuthReady();
    return sendPasswordResetEmail(authInstance, email);
  }

  const handleSignOut = async () => {
    const authInstance = await ensureAuthReady();
    return signOut(authInstance);
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
