
'use client';

import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Transaction, InventoryItem } from '@/lib/types';
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
    const itemSales: Record<string, number> = {};

    transactions.forEach(t => {
      const items = t.medicationName.split(', ').map(itemStr => {
        const match = itemStr.match(/(.+) \(x(\d+)\)/);
        if (!match) return null;
        return { name: match[1], quantity: parseInt(match[2], 10) };
      }).filter(Boolean);

      items.forEach(item => {
        if (item) {
          const inventoryItem = inventory.find(inv => inv.itemName === item.name);
          if (inventoryItem && inventoryItem.itemType === itemType) {
            itemSales[item.name] = (itemSales[item.name] || 0) + item.quantity;
          }
        }
      });
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
        <CardDescription>Top 5 most sold items from the selected period.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead className="text-right">Quantity Sold</TableHead>
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
                  No data available for this period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
