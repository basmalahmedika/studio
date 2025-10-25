
'use client';
import * as React from 'react';
import * as XLSX from 'xlsx';
import { FileDown, TrendingUp } from 'lucide-react';
import type { Transaction, InventoryItem, TransactionItem } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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

interface BpjsExpenditureAnalysisProps {
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

const TopExpenditureTable = ({ title, description, data, onExport }: { title: string, description: string, data: TopBpjsExpenditureTransaction[], onExport: () => void }) => (
  <Card>
    <CardHeader>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1.5">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onExport}>
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
              {data.length > 0 ? (
              data.map(item => (
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
                  Tidak ada data pengeluaran untuk periode ini.
                  </TableCell>
              </TableRow>
              )}
          </TableBody>
          </Table>
      </div>
    </CardContent>
  </Card>
);

export function BpjsExpenditureAnalysis({ transactions, inventory }: BpjsExpenditureAnalysisProps) {

  const processExpenditures = (patientType: 'Rawat Jalan' | 'Rawat Inap'): TopBpjsExpenditureTransaction[] => {
    const individualTransactions: TopBpjsExpenditureTransaction[] = [];

    transactions.forEach(t => {
      if (t.patientType === patientType && t.paymentMethod === 'BPJS' && t.medicalRecordNumber) {
        
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
  };
  
  const topExpendituresRJ = React.useMemo(() => processExpenditures('Rawat Jalan'), [transactions, inventory]);
  const topExpendituresRI = React.useMemo(() => processExpenditures('Rawat Inap'), [transactions, inventory]);

  const handleExportData = (data: TopBpjsExpenditureTransaction[], sheetName: string, fileName: string) => {
    const dataToExport: any[] = [];
    data.forEach(transaction => {
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
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName);
  };

  const bpjsAverages = React.useMemo(() => {
    const rjTransactions = transactions.filter(t => t.patientType === 'Rawat Jalan' && t.paymentMethod === 'BPJS');
    const riTransactions = transactions.filter(t => t.patientType === 'Rawat Inap' && t.paymentMethod === 'BPJS');

    const calculateAverage = (trans: Transaction[]) => {
      const count = trans.length;
      if (count === 0) return { average: 0, count: 0 };
      
      const totalCost = trans.reduce((sum, t) => {
        const transactionCost = (t.items || []).reduce((itemSum, item) => {
           const inventoryItem = inventory.find(inv => inv.id === item.itemId);
           return itemSum + (inventoryItem?.purchasePrice || 0) * item.quantity;
        }, 0);
        return sum + transactionCost;
      }, 0);
      
      return {
        average: totalCost / count,
        count
      };
    }
    
    return {
        averageRJ: calculateAverage(rjTransactions),
        averageRI: calculateAverage(riTransactions),
    }

  }, [transactions, inventory]);

  return (
    <div className='space-y-6'>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopExpenditureTable 
            title="Pengeluaran BPJS RJ Teratas"
            description="Transaksi BPJS Rawat Jalan dengan biaya tertinggi."
            data={topExpendituresRJ}
            onExport={() => handleExportData(topExpendituresRJ, 'Pengeluaran BPJS RJ', 'laporan_pengeluaran_bpjs_rj.xlsx')}
            />
            <TopExpenditureTable 
            title="Pengeluaran BPJS RI Teratas"
            description="Transaksi BPJS Rawat Inap dengan biaya tertinggi."
            data={topExpendituresRI}
            onExport={() => handleExportData(topExpendituresRI, 'Pengeluaran BPJS RI', 'laporan_pengeluaran_bpjs_ri.xlsx')}
            />
        </div>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    Analisis Rata-rata Pengeluaran BPJS
                </CardTitle>
                <CardDescription>Rata-rata biaya per transaksi untuk layanan BPJS. Data ditampilkan berdasarkan filter tanggal utama di atas.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
                 <div className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-4">
                    <div className='space-y-0.5'>
                        <p className="text-sm text-muted-foreground">Rata-rata Pengeluaran per Transaksi RJ</p>
                        <h2 className="text-2xl font-bold">{formatCurrency(bpjsAverages.averageRJ.average)}</h2>
                        <p className="text-xs text-muted-foreground">
                            dari {bpjsAverages.averageRJ.count} transaksi
                        </p>
                    </div>
                </div>
                 <div className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-4">
                    <div className='space-y-0.5'>
                        <p className="text-sm text-muted-foreground">Rata-rata Pengeluaran per Transaksi RI</p>
                        <h2 className="text-2xl font-bold">{formatCurrency(bpjsAverages.averageRI.average)}</h2>
                         <p className="text-xs text-muted-foreground">
                            dari {bpjsAverages.averageRI.count} transaksi
                        </p>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground">
                    Rumus: Rata-rata = (Total Harga Beli dari semua transaksi BPJS) / (Jumlah transaksi BPJS).
                </p>
            </CardFooter>
        </Card>
    </div>
  );
}
