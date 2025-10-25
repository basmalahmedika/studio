
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
interface BpjsPatientExpenditure {
  mrNumber: string;
  totalCost: number;
  items: EnrichedTransactionItem[];
  transactionCount: number;
  lastTransactionDate: string;
}

const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

export function TopBpjsExpenditures({ transactions, inventory }: TopBpjsExpendituresProps) {

  const topExpenditures = React.useMemo(() => {
    const patientExpenditures = new Map<string, BpjsPatientExpenditure>();

    transactions.forEach(t => {
      if (t.patientType === 'Rawat Jalan' && t.paymentMethod === 'BPJS' && t.medicalRecordNumber) {
        let patientData = patientExpenditures.get(t.medicalRecordNumber);
        
        if (!patientData) {
          patientData = {
            mrNumber: t.medicalRecordNumber,
            totalCost: 0,
            items: [],
            transactionCount: 0,
            lastTransactionDate: t.date
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

        patientData.totalCost += transactionCost;
        patientData.items.push(...enrichedItems);
        patientData.transactionCount += 1;
        
        // Keep the latest transaction date
        if (new Date(t.date) > new Date(patientData.lastTransactionDate)) {
             patientData.lastTransactionDate = t.date;
        }

        patientExpenditures.set(t.medicalRecordNumber, patientData);
      }
    });

    return Array.from(patientExpenditures.values())
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);

  }, [transactions, inventory]);

  const handleExportData = () => {
    const dataToExport = topExpenditures.flatMap(patient => 
      patient.items.map(item => ({
        'No. Rekam Medis': patient.mrNumber,
        'Tanggal Transaksi Terakhir': patient.lastTransactionDate,
        'Nama Item': item.itemName,
        'Kuantitas': item.quantity,
        'Harga Beli Satuan': item.purchasePrice,
        'Total Biaya Item': item.subtotal,
        'Total Pengeluaran Pasien': patient.totalCost,
      }))
    );

    if (dataToExport.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws['!cols'] = [
      { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 25 }
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
            <CardTitle>Pengeluaran Pasien BPJS RJ Teratas</CardTitle>
            <CardDescription>Daftar pasien Rawat Jalan BPJS dengan total pengeluaran (berdasarkan harga beli) terbesar.</CardDescription>
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
                <TableHead>No. Rekam Medis</TableHead>
                <TableHead>Tgl Transaksi Terakhir</TableHead>
                <TableHead className="text-right">Total Pengeluaran (Harga Beli)</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {topExpenditures.length > 0 ? (
                topExpenditures.map(item => (
                    <TableRow key={item.mrNumber}>
                        <TableCell>
                            <div className="font-medium">{item.mrNumber}</div>
                             <div className="text-sm text-muted-foreground">{item.transactionCount} transaksi</div>
                        </TableCell>
                         <TableCell>{item.lastTransactionDate}</TableCell>
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

    