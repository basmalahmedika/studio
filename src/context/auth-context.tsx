
'use client';

import * as React from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { app } from '@/lib/firebase'; // Use app from firebase lib

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const authInstanceRef = React.useRef<Auth | null>(null);

  React.useEffect(() => {
    try {
      const auth = getAuth(app);
      authInstanceRef.current = auth;
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (error) {
      console.error("Firebase Auth initialization failed:", error);
      setLoading(false);
    }
  }, []);

  const getAuthInstance = () => {
    if (!authInstanceRef.current) {
      throw new Error("Firebase Auth is not initialized yet.");
    }
    return authInstanceRef.current;
  };

  const login = (email: string, password: string) => {
    const auth = getAuthInstance();
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    const auth = getAuthInstance();
    return signOut(auth);
  };

  const value = {
    user,
    loading,
    login,
    logout,
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
