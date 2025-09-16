'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, ReceiptText, BarChart2, Boxes, Warehouse } from 'lucide-react';
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
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Boxes className="w-8 h-8 text-primary" />
          <h1 className="text-xl font-headline font-bold">PharmaFlow</h1>
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
