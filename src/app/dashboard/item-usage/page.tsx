
'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { startOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { FileDown } from 'lucide-react';

import { useAppContext } from '@/context/app-context';
import type { Transaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

type PatientType = 'all' | 'Rawat Jalan' | 'Rawat Inap';

interface ItemUsageData {
  itemId: string;
  itemName: string;
  totalStockOut: number;
  totalNominal: number;
  remainingStock: number;
}

const calculateUsageData = (
  transactions: Transaction[],
  inventory: any[],
  date: DateRange | undefined,
  patientType: PatientType,
  paymentMethod: 'UMUM' | 'BPJS'
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
      const currentUsage = usageMap.get(item.itemId) || { totalStockOut: 0, totalNominal: 0 };
      currentUsage.totalStockOut += item.quantity;
      currentUsage.totalNominal += item.price * item.quantity;
      usageMap.set(item.itemId, currentUsage);
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
  const { transactions, inventory } = useAppContext();
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [patientType, setPatientType] = React.useState<PatientType>('all');
  
  const itemUsageDataUmum = React.useMemo(() => 
    calculateUsageData(transactions, inventory, date, patientType, 'UMUM'),
    [date, patientType, transactions, inventory]
  );
  
  const itemUsageDataBpjs = React.useMemo(() => 
    calculateUsageData(transactions, inventory, date, patientType, 'BPJS'),
    [date, patientType, transactions, inventory]
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
    XLSX.utils.book_append_sheet(wb, wsUmum, 'Usage Report (UMUM)');
    
    const wsBpjs = XLSX.utils.json_to_sheet(formatDataForExport(itemUsageDataBpjs));
    wsBpjs['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsBpjs, 'Usage Report (BPJS)');

    XLSX.writeFile(wb, 'item_usage_report.xlsx');
  };
  
  const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

  const ItemUsageTable = ({ title, data }: { title: string, data: ItemUsageData[] }) => (
     <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
                A list of items sold within the filtered period, sorted by most sold.
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
                                    No data available for the selected filters.
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
      <div className="space-y-2">
        <h1 className="text-3xl font-headline font-bold tracking-tight">Item Usage Report</h1>
        <p className="text-muted-foreground">
          Monitor items sold based on payment method and selected filters.
        </p>
      </div>
      
      <Card>
        <CardHeader>
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle>Filters & Export</CardTitle>
                <Button variant="outline" size="sm" onClick={handleExportData}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export Excel
                </Button>
            </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DateRangePicker date={date} onDateChange={setDate} />
            <Select value={patientType} onValueChange={(value) => setPatientType(value as PatientType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Patient Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Patient Types</SelectItem>
                <SelectItem value="Rawat Jalan">Rawat Jalan</SelectItem>
                <SelectItem value="Rawat Inap">Rawat Inap</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ItemUsageTable title="Item Usage (UMUM)" data={itemUsageDataUmum} />
        <ItemUsageTable title="Item Usage (BPJS)" data={itemUsageDataBpjs} />
      </div>
    </div>
  );
}
