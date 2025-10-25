
'use client';
import * as React from 'react';
import * as XLSX from 'xlsx';
import { FileDown } from 'lucide-react';
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
import { Button } from './ui/button';

interface TopBpjsExpendituresProps {
  transactions: Transaction[];
  inventory: InventoryItem[];
}

interface EnrichedTransactionItem extends TransactionItem {
  itemName: string;
  purchasePrice: number;
  subtotal: number;
}

interface DailyBpjsExpenditure {
  date: string;
  totalCost: number;
  transactionCount: number;
  patients: {
    mrNumber: string;
    patientTotal: number;
    items: EnrichedTransactionItem[];
  }[];
}

const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

export function TopBpjsExpenditures({ transactions, inventory }: TopBpjsExpendituresProps) {

  const topExpendituresByDate = React.useMemo(() => {
    const dailyExpenditures = new Map<string, DailyBpjsExpenditure>();

    transactions.forEach(t => {
      if (t.patientType === 'Rawat Jalan' && t.paymentMethod === 'BPJS' && t.medicalRecordNumber) {
        
        let dayData = dailyExpenditures.get(t.date);
        
        if (!dayData) {
          dayData = {
            date: t.date,
            totalCost: 0,
            transactionCount: 0,
            patients: [],
          };
        }

        let transactionCost = 0;
        const enrichedItems: EnrichedTransactionItem[] = (t.items || []).map(item => {
            const inventoryItem = inventory.find(inv => inv.id === item.itemId);
            const purchasePrice = inventoryItem?.purchasePrice || 0;
            const subtotal = purchasePrice * item.quantity;
            transactionCost += subtotal;
            return {
                ...item,
                itemName: inventoryItem?.itemName || 'Item tidak dikenal',
                purchasePrice,
                subtotal,
            };
        });

        dayData.totalCost += transactionCost;
        dayData.transactionCount += 1;

        // Group items by patient within the day
        let patientInDay = dayData.patients.find(p => p.mrNumber === t.medicalRecordNumber);
        if (!patientInDay) {
            patientInDay = {
                mrNumber: t.medicalRecordNumber,
                patientTotal: 0,
                items: []
            };
            dayData.patients.push(patientInDay);
        }
        patientInDay.patientTotal += transactionCost;
        patientInDay.items.push(...enrichedItems);

        dailyExpenditures.set(t.date, dayData);
      }
    });

    return Array.from(dailyExpenditures.values())
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);

  }, [transactions, inventory]);

  const handleExportData = () => {
    const dataToExport: any[] = [];
    topExpendituresByDate.forEach(day => {
        day.patients.forEach(patient => {
            patient.items.forEach(item => {
                dataToExport.push({
                    'Tanggal': day.date,
                    'No. Rekam Medis': patient.mrNumber,
                    'Nama Item': item.itemName,
                    'Kuantitas': item.quantity,
                    'Harga Beli Satuan': item.purchasePrice,
                    'Subtotal Item': item.subtotal,
                    'Total Pasien Hari Ini': patient.patientTotal,
                    'Total Pengeluaran Hari Ini': day.totalCost,
                });
            });
        });
    });

    if (dataToExport.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws['!cols'] = [
      { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 25 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pengeluaran BPJS RJ per Hari');
    XLSX.writeFile(wb, 'laporan_pengeluaran_harian_bpjs_rj.xlsx');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <CardTitle>Pengeluaran BPJS RJ Harian Teratas</CardTitle>
            <CardDescription>Daftar tanggal dengan total pengeluaran BPJS Rawat Jalan (berdasarkan harga beli) terbesar.</CardDescription>
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
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-center">Jumlah Transaksi</TableHead>
                    <TableHead className="text-right">Total Pengeluaran (Harga Beli)</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {topExpendituresByDate.length > 0 ? (
                topExpendituresByDate.map(item => (
                    <TableRow key={item.date}>
                        <TableCell>
                            <div className="font-medium">{item.date}</div>
                        </TableCell>
                        <TableCell className="text-center">{item.transactionCount}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(item.totalCost)}</TableCell>
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                    Tidak ada data pengeluaran BPJS RJ untuk periode ini.
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
