
'use client';

import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Transaction, InventoryItem, TransactionItem } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TopSellingItemsProps {
  title: string;
  icon: LucideIcon;
  transactions: Transaction[];
  inventory: InventoryItem[];
  itemType: 'Obat' | 'Alkes';
}

interface SoldItem {
  name: string;
  quantity: number;
}

export function TopSellingItems({ title, icon: Icon, transactions, inventory, itemType }: TopSellingItemsProps) {
  const topItems = React.useMemo(() => {
    if (inventory.length === 0) return [];
    
    const itemSales: Record<string, number> = {};

    transactions.forEach(t => {
      if (t.items) {
          t.items.forEach((item: TransactionItem) => {
              const inventoryItem = inventory.find(inv => inv.id === item.itemId);
              if (inventoryItem && inventoryItem.itemType === itemType) {
                 itemSales[inventoryItem.itemName] = (itemSales[inventoryItem.itemName] || 0) + item.quantity;
              }
          });
      }
    });

    return Object.entries(itemSales)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [transactions, inventory, itemType]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            {title}
        </CardTitle>
        <CardDescription>5 item terlaris dari periode yang dipilih.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Item</TableHead>
              <TableHead className="text-right">Kuantitas Terjual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topItems.length > 0 ? (
              topItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center">
                  Tidak ada data penjualan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
