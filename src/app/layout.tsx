
'use client';

import * as React from 'react';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { initializeFirebase } from '@/lib/firebase';
import type { FirebaseApp } from 'firebase/app';
import { AppProvider } from '@/context/app-context';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [firebaseApp, setFirebaseApp] = React.useState<FirebaseApp | null>(null);

  // Initialize Firebase on the client side when the app loads.
  React.useEffect(() => {
    const app = initializeFirebase();
    setFirebaseApp(app);
  }, []);

  if (!firebaseApp) {
    return null; // or a loading spinner
  }

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
        <AppProvider>
          {children}
        </AppProvider>
        <Toaster />
      </body>
    </html>
  );
}
