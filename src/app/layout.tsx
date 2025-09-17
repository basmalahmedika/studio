
'use client';

import './globals.css';
import * as React from 'react';
import type { FirebaseApp } from 'firebase/app';
import { Toaster } from '@/components/ui/toaster';
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
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [firebaseApp, setFirebaseApp] = React.useState<FirebaseApp | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const app = initializeFirebase();
      setFirebaseApp(app);
    } catch (err: any) {
      console.error("Firebase initialization failed:", err);
      setError("Failed to connect to the application services. Please check your Firebase configuration.");
    }
  }, []);
  
  const renderContent = () => {
    if (error) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-red-500">{error}</p>
        </div>
      );
    }

    if (!firebaseApp) {
      return <FullScreenLoader />;
    }

    return (
      <AppProvider firebaseApp={firebaseApp}>
        {children}
      </AppProvider>
    );
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>PharmaFlow</title>
        <meta name="description" content="Pharmacy Management System" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {renderContent()}
        <Toaster />
      </body>
    </html>
  );
}
