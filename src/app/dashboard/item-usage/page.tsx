
'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import * as XLSX from 'xlsx';
import { FileDown } from 'lucide-react';

import { useAppContext } from '@/context/app-context';
import type { Transaction, InventoryItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

type PaymentMethod = 'UMUM' | 'BPJS' | 'Lain-lain';

interface ItemUsageData {
  itemId: string;
  itemName: string;
  totalStockOut: number;
  totalNominal: number;
  remainingStock: number;
}

const calculateUsageData = (
  transactions: Transaction[],
  inventory: InventoryItem[],
  date: DateRange | undefined,
  patientType: string,
  paymentMethod: PaymentMethod
): ItemUsageData[] => {
  const filteredTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    transactionDate.setHours(0, 0, 0, 0);

    const fromDate = date?.from ? new Date(date.from) : null;
    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    
    const toDate = date?.to ? new Date(date.to) : null;
    if (toDate) toDate.setHours(0, 0, 0, 0);

    const isDateInRange = fromDate && toDate 
      ? transactionDate >= fromDate && transactionDate <= toDate 
      : true;
    
    const isPatientTypeMatch = patientType === 'all' || t.patientType === patientType;
    const isPaymentMethodMatch = t.paymentMethod === paymentMethod;
    return isDateInRange && isPatientTypeMatch && isPaymentMethodMatch;
  });

  const usageMap = new Map<string, { totalStockOut: number; totalNominal: number }>();

  filteredTransactions.forEach(t => {
    if (!t.items) return;
    t.items.forEach(item => {
      const inventoryItem = inventory.find(inv => inv.id === item.itemId);
      if (inventoryItem) {
        const currentUsage = usageMap.get(item.itemId) || { totalStockOut: 0, totalNominal: 0 };
        currentUsage.totalStockOut += item.quantity;
        currentUsage.totalNominal += inventoryItem.purchasePrice * item.quantity;
        usageMap.set(item.itemId, currentUsage);
      }
    });
  });

  const result: ItemUsageData[] = [];
  usageMap.forEach((usage, itemId) => {
    const inventoryItem = inventory.find(inv => inv.id === itemId);
    if (inventoryItem) {
      result.push({
        itemId,
        itemName: inventoryItem.itemName,
        totalStockOut: usage.totalStockOut,
        totalNominal: usage.totalNominal,
        remainingStock: inventoryItem.quantity,
      });
    }
  });

  return result.sort((a, b) => b.totalStockOut - a.totalStockOut);
};


export default function ItemUsagePage() {
  const { transactions, inventory, filters } = useAppContext();
  
  const itemUsageDataUmum = React.useMemo(() => 
    calculateUsageData(transactions, inventory, filters.date, filters.patientType, 'UMUM'),
    [filters, transactions, inventory]
  );
  
  const itemUsageDataBpjs = React.useMemo(() => 
    calculateUsageData(transactions, inventory, filters.date, filters.patientType, 'BPJS'),
    [filters, transactions, inventory]
  );

  const itemUsageDataLain = React.useMemo(() => 
    calculateUsageData(transactions, inventory, filters.date, filters.patientType, 'Lain-lain'),
    [filters, transactions, inventory]
  );

  const handleExportData = () => {
    const wb = XLSX.utils.book_new();

    const formatDataForExport = (data: ItemUsageData[]) => {
      return data.map(item => ({
        'Nama Item': item.itemName,
        'Total Stok Keluar': item.totalStockOut,
        'Nominal Item': item.totalNominal,
        'Sisa Stok': item.remainingStock,
      }));
    };
    
    const wsUmum = XLSX.utils.json_to_sheet(formatDataForExport(itemUsageDataUmum));
    wsUmum['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsUmum, 'Laporan Pemakaian (UMUM)');
    
    const wsBpjs = XLSX.utils.json_to_sheet(formatDataForExport(itemUsageDataBpjs));
    wsBpjs['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsBpjs, 'Laporan Pemakaian (BPJS)');

    const wsLain = XLSX.utils.json_to_sheet(formatDataForExport(itemUsageDataLain));
    wsLain['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsLain, 'Laporan Pemakaian (Lain-lain)');

    XLSX.writeFile(wb, 'laporan_pemakaian_item.xlsx');
  };
  
  const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

  const ItemUsageTable = ({ title, data }: { title: string, data: ItemUsageData[] }) => (
     <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
                Daftar item yang terjual dalam periode yang dipilih, diurutkan berdasarkan yang paling banyak terjual.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto max-h-96">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama Item</TableHead>
                            <TableHead className="text-right">Total Stok Keluar</TableHead>
                            <TableHead className="text-right">Nominal Item</TableHead>
                            <TableHead className="text-right">Sisa Stok</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length > 0 ? (
                            data.map((item) => (
                                <TableRow key={item.itemId}>
                                    <TableCell className="font-medium">{item.itemName}</TableCell>
                                    <TableCell className="text-right font-bold">{item.totalStockOut}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.totalNominal)}</TableCell>
                                    <TableCell className="text-right">{item.remainingStock}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    Tidak ada data untuk filter yang dipilih.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
            <h1 className="text-3xl font-headline font-bold tracking-tight">Laporan Pemakaian Item</h1>
            <p className="text-muted-foreground">
            Pantau item yang terjual berdasarkan metode pembayaran dan filter global yang dipilih.
            </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportData}>
            <FileDown className="mr-2 h-4 w-4" />
            Ekspor Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ItemUsageTable title="Pemakaian Item (UMUM)" data={itemUsageDataUmum} />
        <ItemUsageTable title="Pemakaian Item (BPJS)" data={itemUsageDataBpjs} />
      </div>
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <ItemUsageTable title="Pemakaian Item (Lain-lain)" data={itemUsageDataLain} />
      </div>
    </div>
  );
}

    