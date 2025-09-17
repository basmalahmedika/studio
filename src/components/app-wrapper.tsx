
'use client';

import * as React from 'react';
import type { FirebaseApp } from 'firebase/app';
import { initializeFirebase } from '@/lib/firebase';
import { AppProvider } from '@/context/app-context';
import { Skeleton } from '@/components/ui/skeleton';

function FullScreenLoader() {
  return (
    <div className="flex flex-col min-h-screen p-4 md:p-6 lg:p-8">
      <div className="space-y-4">
        <Skeleton className="h-14 w-full" />
        <div className="flex gap-4">
          <Skeleton className="h-screen w-64 hidden md:block" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppWrapper({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [firebaseApp, setFirebaseApp] = React.useState<FirebaseApp | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [initializing, setInitializing] = React.useState(true);

  React.useEffect(() => {
    try {
      const app = initializeFirebase();
      setFirebaseApp(app);
    } catch (err: any) {
      console.error("Firebase initialization failed:", err);
      setError("Failed to connect to the application services. Please check your Firebase configuration.");
    } finally {
      setInitializing(false);
    }
  }, []);

  if (initializing) {
    return <FullScreenLoader />;
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-4 rounded-md bg-destructive/10 border border-destructive/50">
           <h2 className="text-lg font-semibold text-destructive">Connection Error</h2>
           <p className="text-destructive/90">{error}</p>
        </div>
      </div>
    );
  }

  if (!firebaseApp) {
    return (
        <div className="flex items-center justify-center min-h-screen">
           <div className="text-center p-4 rounded-md bg-destructive/10 border border-destructive/50">
             <h2 className="text-lg font-semibold text-destructive">Initialization Failed</h2>
             <p className="text-destructive/90">Firebase App could not be initialized. The app cannot load.</p>
           </div>
        </div>
      );
  }

  return (
    <AppProvider firebaseApp={firebaseApp}>
      {children}
    </AppProvider>
  );
}
