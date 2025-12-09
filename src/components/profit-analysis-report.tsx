
'use client';

import * as React from 'react';
import * as XLSX from 'xlsx';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DollarSign, FileDown, Printer } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useAppContext } from '@/context/app-context';
import type { Transaction } from '@/lib/types';
import { StatCard } from './stat-card';

const chartConfig = {
  revenue: { label: 'Pendapatan', color: 'hsl(var(--chart-2))' },
  cost: { label: 'Biaya', color: 'hsl(var(--chart-5))' },
  profit: { label: 'Profit', color: 'hsl(var(--primary))' },
};

export function ProfitAnalysisReport() {
  const { transactions, inventory, filters } = useAppContext();
  const [filteredTransactions, setFilteredTransactions] = React.useState<Transaction[]>([]);
  const reportRef = React.useRef<HTMLDivElement>(null);


  React.useEffect(() => {
    const filtered = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      transactionDate.setHours(0, 0, 0, 0);

      const fromDate = filters.date?.from ? new Date(filters.date.from) : null;
      if (fromDate) fromDate.setHours(0, 0, 0, 0);
      
      const toDate = filters.date?.to ? new Date(filters.date.to) : null;
      if (toDate) toDate.setHours(0, 0, 0, 0);

      const isDateInRange = fromDate && toDate 
        ? transactionDate >= fromDate && transactionDate <= toDate 
        : true;
        
      const isPatientTypeMatch = filters.patientType === 'all' || t.patientType === filters.patientType;
      const isPaymentMethodMatch = filters.paymentMethod === 'all' || t.paymentMethod === filters.paymentMethod;

      return isDateInRange && isPatientTypeMatch && isPaymentMethodMatch;
    });
    setFilteredTransactions(filtered);
  }, [filters, transactions]);
  
  const analysisData = React.useMemo(() => {
    const data = {
      obat: { revenue: 0, cost: 0, profit: 0 },
      alkes: { revenue: 0, cost: 0, profit: 0 },
    };

    if (inventory.length === 0) return data;

    filteredTransactions.forEach(t => {
      if (!t.items) return;
      t.items.forEach(item => {
        const inventoryItem = inventory.find(inv => inv.id === item.itemId);
        if (inventoryItem) {
          
          let itemRevenue;
          if (t.paymentMethod === 'UMUM') {
            itemRevenue = item.price * item.quantity;
          } else {
            itemRevenue = inventoryItem.purchasePrice * item.quantity;
          }
          
          const itemCost = inventoryItem.purchasePrice * item.quantity;
          const itemProfit = itemRevenue - itemCost;
          
          if (inventoryItem.itemType === 'Obat') {
            data.obat.revenue += itemRevenue;
            data.obat.cost += itemCost;
            data.obat.profit += itemProfit;
          } else if (inventoryItem.itemType === 'Alkes') {
            data.alkes.revenue += itemRevenue;
            data.alkes.cost += itemCost;
            data.alkes.profit += itemProfit;
          }
        }
      });
    });
    
    return data;
  }, [filteredTransactions, inventory]);

  const chartData = [
    { name: 'Obat', ...analysisData.obat },
    { name: 'Alkes', ...analysisData.alkes },
  ];

  const handleExportData = () => {
    const dataToExport = [
      { Kategori: 'Obat', ...analysisData.obat },
      { Kategori: 'Alkes', ...analysisData.alkes },
      { 
        Kategori: 'Total',
        revenue: analysisData.obat.revenue + analysisData.alkes.revenue,
        cost: analysisData.obat.cost + analysisData.alkes.cost,
        profit: analysisData.obat.profit + analysisData.alkes.profit,
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Analisis Profit');
    
    ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.writeFile(wb, 'laporan_analisis_profit.xlsx');
  };

  const handlePrint = () => {
    const printContents = reportRef.current?.innerHTML;
    
    if (printContents) {
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Cetak Laporan</title>');
        printWindow.document.write('<style>body { font-family: Arial, sans-serif; } .card { border: 1px solid #ccc; border-radius: 8px; margin-bottom: 20px; } .card-header { padding: 16px; border-bottom: 1px solid #ccc; } .card-title { font-size: 1.5rem; font-weight: bold; } .card-description { color: #555; } .card-content { padding: 16px; } .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; } .stat-card { border: 1px solid #eee; padding: 12px; border-radius: 6px; } h4 { font-size: 1.2rem; font-weight: bold; } dl { display: grid; grid-template-columns: 1fr 2fr; gap: 4px; } dt { color: #777; } dd { font-weight: bold; } .chart-container, .print-hide { display: none; } </style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContents);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
    }
  };

  const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              Analisis Profit & Biaya
            </CardTitle>
            <CardDescription>
              Analisis pendapatan, biaya, dan profit dari penjualan berdasarkan filter global yang dipilih.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 print-hide">
             <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Cetak PDF
            </Button>
             <Button variant="outline" size="sm" onClick={handleExportData}>
                <FileDown className="mr-2 h-4 w-4" />
                Ekspor Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent ref={reportRef} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
           <StatCard title="Total Pendapatan" value={formatCurrency(analysisData.obat.revenue + analysisData.alkes.revenue)} icon={DollarSign} description="Total pemasukan dari penjualan" />
           <StatCard title="Total Biaya" value={formatCurrency(analysisData.obat.cost + analysisData.alkes.cost)} icon={DollarSign} description="Total biaya pokok penjualan" />
           <StatCard title="Total Profit" value={formatCurrency(analysisData.obat.profit + analysisData.alkes.profit)} icon={DollarSign} description="Total profit bersih" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
            <Card className="chart-container">
                <CardHeader>
                    <CardTitle>Grafik Analisis</CardTitle>
                    <CardDescription>Visualisasi Pendapatan, Biaya, dan Profit</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <BarChart data={chartData} accessibilityLayer>
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
                        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                        <Bar dataKey="cost" fill="var(--color-cost)" radius={4} />
                        <Bar dataKey="profit" fill="var(--color-profit)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Rincian Detail</CardTitle>
                     <CardDescription>Rincian numerik berdasarkan tipe item</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-lg">Obat</h4>
                            <dl className="grid grid-cols-3 gap-2 text-sm mt-2">
                                <dt className="text-muted-foreground">Pendapatan</dt>
                                <dd className="col-span-2">{formatCurrency(analysisData.obat.revenue)}</dd>
                                <dt className="text-muted-foreground">Biaya</dt>
                                <dd className="col-span-2">{formatCurrency(analysisData.obat.cost)}</dd>
                                <dt className="text-muted-foreground">Profit</dt>
                                <dd className="col-span-2 font-bold text-primary">{formatCurrency(analysisData.obat.profit)}</dd>
                            </dl>
                        </div>
                         <div>
                            <h4 className="font-semibold text-lg">Alkes</h4>
                             <dl className="grid grid-cols-3 gap-2 text-sm mt-2">
                                <dt className="text-muted-foreground">Pendapatan</dt>
                                <dd className="col-span-2">{formatCurrency(analysisData.alkes.revenue)}</dd>
                                <dt className="text-muted-foreground">Biaya</dt>
                                <dd className="col-span-2">{formatCurrency(analysisData.alkes.cost)}</dd>
                                <dt className="text-muted-foreground">Profit</dt>
                                <dd className="col-span-2 font-bold text-primary">{formatCurrency(analysisData.alkes.profit)}</dd>
                            </dl>
                        </div>
                   </div>
                </CardContent>
            </Card>
        </div>
      </CardContent>
    </Card>
  );
}

    