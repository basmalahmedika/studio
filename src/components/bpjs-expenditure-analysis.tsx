
'use client';
import * as React from 'react';
import * as XLSX from 'xlsx';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
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
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';


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

const chartConfig = {
  averageRJ: { label: 'Rata-Rata RJ', color: 'hsl(var(--chart-2))' },
  averageRI: { label: 'Rata-Rata RI', color: 'hsl(var(--chart-5))' },
};

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
                  <TableHead className="text-right">Total Pengeluaran</TableHead>
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
        
        const totalCost = t.totalPrice; // Use the stored total price as the source of truth

        const enrichedItems: EnrichedTransactionItem[] = (t.items || []).map(item => {
            const inventoryItem = inventory.find(inv => inv.id === item.itemId);
            const purchasePrice = inventoryItem?.purchasePrice || 0;
            // Subtotal is based on purchase price, but totalCost for the transaction is t.totalPrice
            const subtotal = purchasePrice * item.quantity; 
            return {
                ...item,
                itemName: inventoryItem?.itemName || 'Item tidak dikenal',
                purchasePrice,
                subtotal,
            };
        });
        
        if (totalCost > 0) {
            individualTransactions.push({
                transactionId: t.id,
                date: t.date,
                medicalRecordNumber: t.medicalRecordNumber,
                totalCost: totalCost, // Use the definitive totalCost
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

  const { overallAverages, monthlyAveragesChartData } = React.useMemo(() => {
    const bpjsTransactions = transactions.filter(t => t.paymentMethod === 'BPJS');
    
    // --- Overall Average Calculation ---
    const rjTransactions = bpjsTransactions.filter(t => t.patientType === 'Rawat Jalan');
    const riTransactions = bpjsTransactions.filter(t => t.patientType === 'Rawat Inap');
    
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
      
      return { average: totalCost / count, count };
    };
    
    const overallAverages = {
      averageRJ: calculateAverage(rjTransactions),
      averageRI: calculateAverage(riTransactions),
    };

    // --- Monthly Average Calculation ---
    const monthlyData: Record<string, { rjCost: number, rjCount: number, riCost: number, riCount: number }> = {};
    bpjsTransactions.forEach(t => {
      const month = new Date(t.date).toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!monthlyData[month]) {
        monthlyData[month] = { rjCost: 0, rjCount: 0, riCost: 0, riCount: 0 };
      }

      const transactionCost = (t.items || []).reduce((itemSum, item) => {
        const inventoryItem = inventory.find(inv => inv.id === item.itemId);
        return itemSum + (inventoryItem?.purchasePrice || 0) * item.quantity;
      }, 0);

      if (t.patientType === 'Rawat Jalan') {
        monthlyData[month].rjCost += transactionCost;
        monthlyData[month].rjCount += 1;
      } else if (t.patientType === 'Rawat Inap') {
        monthlyData[month].riCost += transactionCost;
        monthlyData[month].riCount += 1;
      }
    });

    const chartData = Object.entries(monthlyData).map(([month, data]) => ({
      name: month,
      averageRJ: data.rjCount > 0 ? data.rjCost / data.rjCount : 0,
      averageRI: data.riCount > 0 ? data.riCost / data.riCount : 0,
    })).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

    return { overallAverages, monthlyAveragesChartData: chartData };

  }, [transactions, inventory]);

  return (
    <div className='space-y-6'>
       <Card className="bg-gradient-to-br from-green-500 to-yellow-500 text-white">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Analisis Rata-rata Pengeluaran BPJS
                </CardTitle>
                <CardDescription className='text-white/80'>Rata-rata biaya per transaksi untuk layanan BPJS. Data ditampilkan berdasarkan filter tanggal utama di atas.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
                 <div className="flex flex-row items-center justify-between space-y-0 rounded-lg border border-white/20 bg-white/10 p-4">
                    <div className='space-y-0.5'>
                        <p className="text-sm">Rata-rata Pengeluaran per Transaksi RJ</p>
                        <h2 className="text-2xl font-bold">{formatCurrency(overallAverages.averageRJ.average)}</h2>
                        <p className="text-xs text-white/80">
                            dari {overallAverages.averageRJ.count} transaksi
                        </p>
                    </div>
                </div>
                 <div className="flex flex-row items-center justify-between space-y-0 rounded-lg border border-white/20 bg-white/10 p-4">
                    <div className='space-y-0.5'>
                        <p className="text-sm">Rata-rata Pengeluaran per Transaksi RI</p>
                        <h2 className="text-2xl font-bold">{formatCurrency(overallAverages.averageRI.average)}</h2>
                         <p className="text-xs text-white/80">
                            dari {overallAverages.averageRI.count} transaksi
                        </p>
                    </div>
                </div>
                 <div className="md:col-span-2">
                  <Card className='text-card-foreground'>
                      <CardHeader>
                          <CardTitle>Perbandingan Rata-Rata Pengeluaran Bulanan</CardTitle>
                          <CardDescription>Perbandingan rata-rata biaya per transaksi BPJS antara Rawat Jalan dan Rawat Inap setiap bulan.</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <ChartContainer config={chartConfig} className="h-[300px] w-full">
                              <BarChart data={monthlyAveragesChartData} accessibilityLayer>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                                <YAxis tickFormatter={(value) => `Rp ${Number(value) / 1000}k`} />
                                <Tooltip
                                    cursor={false}
                                    content={<ChartTooltipContent 
                                        formatter={(value) => formatCurrency(Number(value))} 
                                        indicator="dot" 
                                    />}
                                />
                                <Legend />
                                <Bar dataKey="averageRJ" fill="var(--color-averageRJ)" radius={4} />
                                <Bar dataKey="averageRI" fill="var(--color-averageRI)" radius={4} />
                              </BarChart>
                          </ChartContainer>
                      </CardContent>
                  </Card>
                </div>
            </CardContent>
            <CardFooter>
                <p className="text-xs text-white/80">
                    Rata-rata dihitung dengan rumus: (Total Harga Beli dari semua transaksi BPJS) / (Jumlah transaksi BPJS).
                </p>
            </CardFooter>
        </Card>
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
    </div>
  );
}
