
'use client';

import { usePathname } from 'next/navigation';
import * as React from 'react';
import Link from 'next/link';
import { LayoutDashboard, ReceiptText, BarChart2, Boxes, Warehouse, FileText, Settings, ArrowRightLeft } from 'lucide-react';
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

const navItems = [
  { href: '/dashboard', label: 'Dasbor', icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transaksi', icon: ReceiptText },
  { href: '/dashboard/inventory', label: 'Inventaris', icon: Warehouse },
  { href: '/dashboard/item-usage', label: 'Pemakaian Item', icon: ArrowRightLeft },
  { href: '/dashboard/analysis', label: 'Analisis', icon: BarChart2 },
  { href: '/dashboard/reports', label: 'Laporan', icon: FileText },
  { href: '/dashboard/settings', label: 'Pengaturan', icon: Settings },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const [appName, setAppName] = React.useState('PharmaFlow');
  const [logo, setLogo] = React.useState<string | null>(null);

  React.useEffect(() => {
    // This listener now correctly waits for DashboardLayout to load the theme
    const handleThemeUpdate = (event: Event) => {
        const theme = (event as CustomEvent).detail;
        if (theme) {
          setAppName(theme.appName || 'PharmaFlow');
          setLogo(theme.logo || null);
        }
    };

    window.addEventListener('theme-updated', handleThemeUpdate);
    
    // Also, trigger a manual check in case the event fired before this component mounted
    const savedTheme = localStorage.getItem('appTheme');
    if (savedTheme) {
        handleThemeUpdate(new CustomEvent('theme-updated', { detail: JSON.parse(savedTheme) }));
    }

    return () => {
      window.removeEventListener('theme-updated', handleThemeUpdate);
    };
  }, []);

  return (
    <>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 flex items-center justify-center">
            {logo ? (
              <img src={logo} alt="App Logo" className="w-8 h-8 object-contain" />
            ) : (
              <Boxes className="w-8 h-8 text-primary" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-headline font-bold leading-tight">{appName}</h1>
            <p className="text-xs text-sidebar-foreground/80">Klinik Basmalah Medika</p>
          </div>
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
