
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
import { getFirebaseAuth } from '@/lib/firebase';

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
  
  // Lazily get auth instance inside useEffect to ensure it runs client-side
  React.useEffect(() => {
    try {
      const auth = getFirebaseAuth();
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (error) {
      console.error("Failed to initialize Firebase Auth:", error);
      setLoading(false); // Stop loading on error
    }
  }, []);

  const signIn = (email: string, pass: string) => {
    return signInWithEmailAndPassword(getFirebaseAuth(), email, pass);
  };
  
  const signUp = (email: string, pass: string) => {
    return createUserWithEmailAndPassword(getFirebaseAuth(), email, pass);
  };
  
  const sendPasswordReset = (email: string) => {
    return sendPasswordResetEmail(getFirebaseAuth(), email);
  }

  const handleSignOut = () => {
    return signOut(getFirebaseAuth());
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
