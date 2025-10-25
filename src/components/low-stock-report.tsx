
'use client';

import * as React from 'react';
import * as XLSX from 'xlsx';
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
import { useAppContext } from '@/context/app-context';
import type { InventoryItem } from '@/lib/types';
import { AlertTriangle, FileDown } from 'lucide-react';

const LOW_STOCK_THRESHOLD = 50;

export function LowStockReport() {
  const { inventory } = useAppContext();
  const [lowStockItems, setLowStockItems] = React.useState<InventoryItem[]>([]);

  React.useEffect(() => {
    const filteredItems = inventory.filter(item => item.quantity < LOW_STOCK_THRESHOLD);
    setLowStockItems(filteredItems);
  }, [inventory]);

  const handleExportData = () => {
    const dataToExport = lowStockItems.map((item) => ({
      'Nama Item': item.itemName,
      'Sisa Kuantitas': item.quantity,
    }));
    
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stok Menipis');

    ws['!cols'] = [
        { wch: 30 }, 
        { wch: 15 },
    ];

    XLSX.writeFile(wb, 'laporan_stok_menipis.xlsx');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Laporan Stok Menipis
            </CardTitle>
            <CardDescription>
              Item dengan kuantitas di bawah {LOW_STOCK_THRESHOLD} unit.
            </CardDescription>
          </div>
           <Button variant="outline" size="sm" onClick={handleExportData}>
              <FileDown className="mr-2 h-4 w-4" />
              Ekspor Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
         <div className="overflow-x-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Item</TableHead>
                  <TableHead className="text-right">Kuantitas</TableHead>
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
                      Tidak ada item yang stoknya menipis.
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
