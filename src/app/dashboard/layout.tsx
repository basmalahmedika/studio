
'use client';

import type { ReactNode } from 'react';
import * as React from 'react';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import SidebarNav from '@/components/layout/sidebar-nav';
import Header from '@/components/layout/header';
import { AppProvider } from '@/context/app-context';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppContext } from '@/context/app-context';
import PrivateRoute from '@/components/auth/private-route';


function DashboardContent({ children }: { children: ReactNode }) {
  const { loading } = useAppContext();

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
           <div className="space-y-4">
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
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
   // Effect to apply theme from localStorage on initial load
  React.useEffect(() => {
    const applySavedTheme = () => {
      const savedTheme = localStorage.getItem('appTheme');
      if (savedTheme) {
        const theme = JSON.parse(savedTheme);
        
        const hexToHslString = (hex: string): string => {
          let r = 0, g = 0, b = 0;
          if (hex.length === 4) {
              r = parseInt(hex[1] + hex[1], 16);
              g = parseInt(hex[2] + hex[2], 16);
              b = parseInt(hex[3] + hex[3], 16);
          } else if (hex.length === 7) {
              r = parseInt(hex.substring(1, 3), 16);
              g = parseInt(hex.substring(3, 5), 16);
              b = parseInt(hex.substring(5, 7), 16);
          }

          r /= 255; g /= 255; b /= 255;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          let h = 0, s = 0, l = (max + min) / 2;

          if (max !== min) {
              const d = max - min;
              s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
              switch (max) {
              case r: h = (g - b) / d + (g < b ? 6 : 0); break;
              case g: h = (b - r) / d + 2; break;
              case b: h = (r - g) / d + 4; break;
              }
              h /= 6;
          }

          h = Math.round(h * 360);
          s = Math.round(s * 100);
          l = Math.round(l * 100);

          return `${h} ${s}% ${l}%`;
      };

        document.documentElement.style.setProperty('--primary', hexToHslString(theme.primaryColor));
        document.documentElement.style.setProperty('--background', hexToHslString(theme.backgroundColor));
        document.documentElement.style.setProperty('--accent', hexToHslString(theme.accentColor));
        document.documentElement.style.setProperty('--sidebar-primary', hexToHslString(theme.primaryColor));
        
        // Dispatch event to notify components about theme update
        window.dispatchEvent(new CustomEvent('theme-updated', { detail: theme }));
      }
    }
    
    applySavedTheme();

    const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'appTheme') {
            applySavedTheme();
        }
    };
    
    // Listen for changes from other tabs
    window.addEventListener('storage', handleStorageChange);
    
    // Custom event listener for same-tab updates
    window.addEventListener('theme-updated', applySavedTheme as EventListener);


    return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('theme-updated', applySavedTheme as EventListener);
    };

  }, []);


  return (
    <PrivateRoute>
      <AppProvider>
        <SidebarProvider>
          <Sidebar>
            <SidebarNav />
          </Sidebar>
          <SidebarInset>
            <DashboardContent>{children}</DashboardContent>
          </SidebarInset>
        </SidebarProvider>
      </AppProvider>
    </PrivateRoute>
  );
}
