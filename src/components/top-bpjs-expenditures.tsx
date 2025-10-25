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

interface TopBpjsExpenditureTransaction {
  transactionId: string;
  date: string;
  medicalRecordNumber: string;
  totalCost: number;
  items: EnrichedTransactionItem[];
}

const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

export function TopBpjsExpenditures({ transactions, inventory }: TopBpjsExpendituresProps) {

  const topExpenditures = React.useMemo(() => {
    const individualTransactions: TopBpjsExpenditureTransaction[] = [];

    transactions.forEach(t => {
      if (t.patientType === 'Rawat Jalan' && t.paymentMethod === 'BPJS' && t.medicalRecordNumber) {
        
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
        
        if (transactionCost > 0) {
            individualTransactions.push({
                transactionId: t.id,
                date: t.date,
                medicalRecordNumber: t.medicalRecordNumber,
                totalCost: transactionCost,
                items: enrichedItems,
            });
        }
      }
    });

    return individualTransactions
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);

  }, [transactions, inventory]);

  const handleExportData = () => {
    const dataToExport: any[] = [];
    topExpenditures.forEach(transaction => {
      transaction.items.forEach(item => {
        dataToExport.push({
          'Tanggal': transaction.date,
          'No. Rekam Medis': transaction.medicalRecordNumber,
          'Total Transaksi': transaction.totalCost,
          'Nama Item': item.itemName,
          'Kuantitas': item.quantity,
          'Harga Beli Satuan': item.purchasePrice,
          'Subtotal Item': item.subtotal,
        });
      });
    });

    if (dataToExport.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws['!cols'] = [
      { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 20 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pengeluaran BPJS RJ Teratas');
    XLSX.writeFile(wb, 'laporan_pengeluaran_bpjs_rj_teratas.xlsx');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <CardTitle>Transaksi Pengeluaran BPJS RJ Teratas</CardTitle>
            <CardDescription>Daftar transaksi dengan total pengeluaran BPJS Rawat Jalan (berdasarkan harga beli) terbesar.</CardDescription>
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
                    <TableHead>No. Rekam Medis</TableHead>
                    <TableHead className="text-right">Total Pengeluaran (Harga Beli)</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {topExpenditures.length > 0 ? (
                topExpenditures.map(item => (
                    <TableRow key={item.transactionId}>
                        <TableCell>
                            <div className="font-medium">{item.date}</div>
                        </TableCell>
                         <TableCell>
                            <div className="font-medium">{item.medicalRecordNumber}</div>
                        </TableCell>
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
