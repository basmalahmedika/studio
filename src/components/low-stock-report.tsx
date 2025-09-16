'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { inventory } from '@/lib/data';
import type { InventoryItem } from '@/lib/types';
import { AlertTriangle } from 'lucide-react';

const LOW_STOCK_THRESHOLD = 50;

export function LowStockReport() {
  const [lowStockItems, setLowStockItems] = React.useState<InventoryItem[]>([]);

  React.useEffect(() => {
    const filteredItems = inventory.filter(item => item.quantity < LOW_STOCK_THRESHOLD);
    setLowStockItems(filteredItems);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Low Stock Report
        </CardTitle>
        <CardDescription>
          Items with quantity below {LOW_STOCK_THRESHOLD} units.
        </CardDescription>
      </CardHeader>
      <CardContent>
         <div className="overflow-x-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.length > 0 ? (
                  lowStockItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell className="text-right text-destructive font-bold">{item.quantity}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      No items are running low on stock.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
         </div>
      </CardContent>
    </Card>
  );
}
