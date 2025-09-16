'use client';

import * as React from 'react';
import Papa from 'papaparse';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { inventory } from '@/lib/data';
import type { InventoryItem } from '@/lib/types';
import { AlertTriangle, FileDown } from 'lucide-react';

const LOW_STOCK_THRESHOLD = 50;

export function LowStockReport() {
  const [lowStockItems, setLowStockItems] = React.useState<InventoryItem[]>([]);

  React.useEffect(() => {
    const filteredItems = inventory.filter(item => item.quantity < LOW_STOCK_THRESHOLD);
    setLowStockItems(filteredItems);
  }, []);

  const handleExportData = () => {
    const dataToExport = lowStockItems.map((item) => ({
      'Nama Item': item.itemName,
      'Sisa Kuantitas': item.quantity,
    }));
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'low_stock_report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Low Stock Report
            </CardTitle>
            <CardDescription>
              Items with quantity below {LOW_STOCK_THRESHOLD} units.
            </CardDescription>
          </div>
           <Button variant="outline" size="sm" onClick={handleExportData}>
              <FileDown className="mr-2 h-4 w-4" />
              Export CSV
          </Button>
        </div>
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
