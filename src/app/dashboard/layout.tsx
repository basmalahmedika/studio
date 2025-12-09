
'use client';

import type { ReactNode } from 'react';
import * as React from 'react';
import { usePathname } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import SidebarNav from '@/components/layout/sidebar-nav';
import Header from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppContext } from '@/context/app-context';
import { GlobalFilters } from '@/components/global-filters';

function DashboardContent({ children }: { children: ReactNode }) {
  const { loading: appLoading } = useAppContext();
  const pathname = usePathname();

  const showGlobalFilters = !['/dashboard/inventory', '/dashboard/reports', '/dashboard/settings'].includes(pathname);
  
  if (appLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
           <Skeleton className="h-40 w-full" />
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
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        {showGlobalFilters && <GlobalFilters />}
        {children}
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const applySavedTheme = React.useCallback(() => {
    const savedTheme = localStorage.getItem('appTheme');
    if (savedTheme) {
      const theme = JSON.parse(savedTheme);
      
      const hexToHslString = (hex: string): string => {
        if (!hex || !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) {
            return '';
        }
        
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

      const root = document.documentElement;
      
      const setCssVar = (name: string, value: string | undefined) => {
        const hsl = value ? hexToHslString(value) : null;
        if (hsl) {
            root.style.setProperty(name, hsl);
        }
      };
      
      // Main colors
      setCssVar('--primary', theme.primaryColor);
      setCssVar('--background', theme.backgroundColor);
      setCssVar('--accent', theme.accentColor);
      setCssVar('--foreground', theme.foregroundColor);
      
      // Sidebar colors - derived from sidebar-specific settings
      setCssVar('--sidebar-background', theme.sidebarBackgroundColor);
      setCssVar('--sidebar-accent', theme.sidebarAccentColor);

      // Sidebar primary is the same as main primary
      setCssVar('--sidebar-primary', theme.primaryColor);

      // Determine sidebar foreground based on its background color for readability
      if (theme.sidebarBackgroundColor) {
        const sbBg = theme.sidebarBackgroundColor;
        const r = parseInt(sbBg.slice(1, 3), 16);
        const g = parseInt(sbBg.slice(3, 5), 16);
        const b = parseInt(sbBg.slice(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        // If sidebar background is dark, use a light foreground, otherwise use the main foreground
        if (brightness < 128) {
           root.style.setProperty('--sidebar-foreground', '210 20% 98%'); // Light gray
           root.style.setProperty('--sidebar-accent-foreground', '210 20% 98%');
           root.style.setProperty('--sidebar-primary-foreground', '210 20% 98%');
        } else {
           setCssVar('--sidebar-foreground', theme.foregroundColor);
           setCssVar('--sidebar-accent-foreground', theme.foregroundColor);
           setCssVar('--sidebar-primary-foreground', theme.primaryColorForeground || '210 20% 98%');
        }
      }

      window.dispatchEvent(new CustomEvent('theme-updated', { detail: theme }));
    }
  }, []);

  React.useEffect(() => {
    applySavedTheme();

    const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'appTheme') {
            applySavedTheme();
        }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('theme-updated', applySavedTheme as EventListener);

    return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('theme-updated', applySavedTheme as EventListener);
    };
  }, [applySavedTheme]);

  return (
    <SidebarProvider>
      <Sidebar>
          <SidebarNav />
      </Sidebar>
      <SidebarInset>
          <DashboardContent>{children}</DashboardContent>
      </SidebarInset>
    </SidebarProvider>
  );
}

    