
'use client';

import * as React from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const handleSignOut = () => {
    return signOut(auth);
  };
  
  const value = {
    user,
    loading,
    signIn,
    signOut: handleSignOut,
  };

  if (loading) {
     return (
        <div className="flex h-screen w-screen items-center justify-center">
          <div className="w-full max-w-sm space-y-4">
            <Skeleton className="h-10 w-10 mx-auto" />
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-full mx-auto" />
            <div className="space-y-4 pt-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                 <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
