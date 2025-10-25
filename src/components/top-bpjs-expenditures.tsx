
'use client';
import * as React from 'react';
import type { Transaction } from '@/lib/types';
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
}

interface PatientExpenditure {
  mrNumber: string;
  total: number;
}

const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

export function TopBpjsExpenditures({ transactions }: TopBpjsExpendituresProps) {

  const topExpenditures = React.useMemo(() => {
    const patientTotals: Record<string, number> = {};

    transactions.forEach(t => {
      if (t.patientType === 'Rawat Jalan' && t.paymentMethod === 'BPJS' && t.medicalRecordNumber) {
        patientTotals[t.medicalRecordNumber] = (patientTotals[t.medicalRecordNumber] || 0) + t.totalPrice;
      }
    });

    return Object.entries(patientTotals)
      .map(([mrNumber, total]) => ({ mrNumber, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

  }, [transactions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengeluaran BPJS RJ Teratas</CardTitle>
        <CardDescription>5 pasien Rawat Jalan BPJS dengan pengeluaran terbesar.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Rekam Medis</TableHead>
              <TableHead className="text-right">Total Pengeluaran</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topExpenditures.length > 0 ? (
              topExpenditures.map(item => (
                <TableRow key={item.mrNumber}>
                  <TableCell>
                    <div className="font-medium">{item.mrNumber}</div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(item.total)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center">
                  Tidak ada data pengeluaran BPJS RJ.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
