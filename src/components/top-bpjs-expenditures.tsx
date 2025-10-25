
'use client';
import * as React from 'react';
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

interface TopBpjsExpendituresProps {
  transactions: Transaction[];
  inventory: InventoryItem[];
}

interface BpjsTransactionExpenditure {
  id: string;
  date: string;
  mrNumber: string;
  totalCost: number;
}

const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

export function TopBpjsExpenditures({ transactions, inventory }: TopBpjsExpendituresProps) {

  const topExpenditures = React.useMemo(() => {
    const bpjsRjTransactions: BpjsTransactionExpenditure[] = [];

    transactions.forEach(t => {
      if (t.patientType === 'Rawat Jalan' && t.paymentMethod === 'BPJS' && t.medicalRecordNumber) {
        
        const totalCost = (t.items || []).reduce((acc, item) => {
            const inventoryItem = inventory.find(inv => inv.id === item.itemId);
            const purchasePrice = inventoryItem?.purchasePrice || 0;
            return acc + (purchasePrice * item.quantity);
        }, 0);

        bpjsRjTransactions.push({
            id: t.id,
            date: t.date,
            mrNumber: t.medicalRecordNumber,
            totalCost: totalCost
        });
      }
    });

    return bpjsRjTransactions
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);

  }, [transactions, inventory]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaksi Pengeluaran BPJS RJ Teratas</CardTitle>
        <CardDescription>Daftar transaksi Rawat Jalan BPJS dengan pengeluaran (berdasarkan harga beli) terbesar.</CardDescription>
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
                    <TableRow key={item.id}>
                        <TableCell>{item.date}</TableCell>
                        <TableCell>
                            <div className="font-medium">{item.mrNumber}</div>
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
