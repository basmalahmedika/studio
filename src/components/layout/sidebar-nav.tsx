'use client';

import { usePathname } from 'next/navigation';
import * as React from 'react';
import Link from 'next/link';
import { LayoutDashboard, ReceiptText, BarChart2, Boxes, Warehouse, FileText, Settings } from 'lucide-react';
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transactions', icon: ReceiptText },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Warehouse },
  { href: '/dashboard/analysis', label: 'Analysis', icon: BarChart2 },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const [appName, setAppName] = React.useState('PharmaFlow');
  const [logo, setLogo] = React.useState<string | null>(null);

  React.useEffect(() => {
    const applyTheme = () => {
      const savedTheme = localStorage.getItem('appTheme');
      if (savedTheme) {
        const theme = JSON.parse(savedTheme);
        setAppName(theme.appName || 'PharmaFlow');
        setLogo(theme.logo || null);
      }
    };
    
    applyTheme();
    
    // Listen for custom event when theme is updated in settings
    const handleThemeUpdate = (event: Event) => {
        const theme = (event as CustomEvent).detail;
        setAppName(theme.appName || 'PharmaFlow');
        setLogo(theme.logo || null);
    };

    window.addEventListener('theme-updated', handleThemeUpdate);
    
    return () => {
      window.removeEventListener('theme-updated', handleThemeUpdate);
    };
  }, []);

  return (
    <>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 flex items-center justify-center">
            {logo ? (
              <img src={logo} alt="App Logo" className="w-8 h-8 object-contain" />
            ) : (
              <Boxes className="w-8 h-8 text-primary" />
            )}
          </div>
          <h1 className="text-xl font-headline font-bold">{appName}</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                className="justify-start"
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
