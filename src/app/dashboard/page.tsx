
'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { startOfMonth, subDays, differenceInDays } from 'date-fns';
import { DollarSign, ReceiptText, Users, Pill, Stethoscope, ArrowUp, ArrowDown } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { RecentTransactions } from '@/components/recent-transactions';
import { TopSellingItems } from '@/components/top-selling-items';
import { DateRangePicker } from '@/components/date-range-picker';
import { useAppContext } from '@/context/app-context';
import type { Transaction } from '@/lib/types';
import { MonthlyRevenueChart } from '@/components/monthly-revenue-chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface DetailedStats {
  revenue: number;
  transactions: number;
}

interface AllStats {
  totalRevenue: number;
  totalExpenditure: number;
  totalTransactions: number;
  details: Record<string, DetailedStats>;
}

const calculateStats = (transactions: Transaction[]): AllStats => {
    const stats: AllStats = {
      totalRevenue: 0,
      totalExpenditure: 0,
      totalTransactions: 0,
      details: {
        'Rawat Jalan-UMUM': { revenue: 0, transactions: 0 },
        'Rawat Jalan-BPJS': { revenue: 0, transactions: 0 },
        'Rawat Jalan-Lain-lain': { revenue: 0, transactions: 0 },
        'Rawat Inap-UMUM': { revenue: 0, transactions: 0 },
        'Rawat Inap-BPJS': { revenue: 0, transactions: 0 },
        'Rawat Inap-Lain-lain': { revenue: 0, transactions: 0 },
        'Lain-lain-UMUM': { revenue: 0, transactions: 0 },
        'Lain-lain-BPJS': { revenue: 0, transactions: 0 },
        'Lain-lain-Lain-lain': { revenue: 0, transactions: 0 },
      },
    };

    transactions.forEach(t => {
      stats.totalTransactions += 1;
      const key = `${t.patientType}-${t.paymentMethod}`;
      
      if (stats.details[key]) {
        stats.details[key].transactions += 1;
        stats.details[key].revenue += t.totalPrice;
      }
      
      if (t.paymentMethod === 'UMUM') {
        stats.totalRevenue += t.totalPrice;
      } else {
        stats.totalExpenditure += t.totalPrice;
      }
    });

    return stats;
};

const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

const PercentageChange = ({ change }: { change: number }) => {
  if (isNaN(change) || !isFinite(change)) {
    return <span className="text-xs text-muted-foreground">N/A</span>;
  }
  const isIncrease = change > 0;
  const isDecrease = change < 0;
  const color = isIncrease ? 'text-green-600' : isDecrease ? 'text-red-600' : 'text-muted-foreground';
  const Icon = isIncrease ? ArrowUp : ArrowDown;

  return (
    <span className={`flex items-center text-xs font-semibold ${color}`}>
      {isIncrease || isDecrease ? <Icon className="h-3 w-3 mr-1" /> : null}
      {Math.abs(change).toFixed(1)}%
    </span>
  );
};


export default function DashboardPage() {
  const { transactions, inventory } = useAppContext();

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const { currentPeriodStats, previousPeriodStats, chartData, topBpjsExpenditures } = React.useMemo(() => {
    const filterAndCalcStats = (range: DateRange | undefined): { stats: AllStats; filtered: Transaction[] } => {
        const filtered = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            transactionDate.setHours(0, 0, 0, 0);
            const fromDate = range?.from ? new Date(range.from) : null;
            if (fromDate) fromDate.setHours(0, 0, 0, 0);
            const toDate = range?.to ? new Date(range.to) : null;
            if (toDate) toDate.setHours(0, 0, 0, 0);
            return fromDate && toDate ? transactionDate >= fromDate && transactionDate <= toDate : true;
        });
        return { stats: calculateStats(filtered), filtered };
    };

    const current = filterAndCalcStats(date);

    const prevDate = date?.from && date.to ? {
        from: subDays(date.from, differenceInDays(date.to, date.from) + 1),
        to: subDays(date.from, 1),
    } : undefined;
    const previous = filterAndCalcStats(prevDate);
    
    // Chart data calculation
    const monthlyData: Record<string, { revenue: number, expenditure: number }> = {};
    current.filtered.forEach(t => {
        const month = new Date(t.date).toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!monthlyData[month]) {
            monthlyData[month] = { revenue: 0, expenditure: 0 };
        }
        if (t.paymentMethod === 'UMUM') {
            monthlyData[month].revenue += t.totalPrice;
        } else {
            monthlyData[month].expenditure += t.totalPrice;
        }
    });
    
    const chartData = Object.entries(monthlyData)
      .map(([name, values]) => ({ name, ...values }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
      
    // Top BPJS expenditures
    const bpjsRjTransactions = current.filtered
      .filter(t => t.patientType === 'Rawat Jalan' && t.paymentMethod === 'BPJS')
      .sort((a,b) => b.totalPrice - a.totalPrice)
      .slice(0, 5);

    return {
        currentPeriodStats: current.stats,
        previousPeriodStats: previous.stats,
        chartData,
        topBpjsExpenditures: bpjsRjTransactions,
    };

  }, [date, transactions]);

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) {
      return current > 0 ? Infinity : 0;
    }
    return ((current - previous) / previous) * 100;
  };
  
  const detailCategories: { key: string; label: string; patientType: string; paymentMethod: string; }[] = [
    { key: 'Rawat Jalan-UMUM', label: 'Pendapatan RJ Umum', patientType: 'Rawat Jalan', paymentMethod: 'UMUM' },
    { key: 'Rawat Inap-UMUM', label: 'Pendapatan RI Umum', patientType: 'Rawat Inap', paymentMethod: 'UMUM' },
    { key: 'Lain-lain-UMUM', label: 'Pendapatan Lain-lain Umum', patientType: 'Lain-lain', paymentMethod: 'UMUM' },
    { key: 'Rawat Jalan-BPJS', label: 'Pengeluaran RJ BPJS', patientType: 'Rawat Jalan', paymentMethod: 'BPJS' },
    { key: 'Rawat Inap-BPJS', label: 'Pengeluaran RI BPJS', patientType: 'Rawat Inap', paymentMethod: 'BPJS' },
    { key: 'Lain-lain-BPJS', label: 'Pengeluaran Lain-lain BPJS', patientType: 'Lain-lain', paymentMethod: 'BPJS' },
    { key: 'Lain-lain-Lain-lain', label: 'Pengeluaran Lain-lain', patientType: 'Lain-lain', paymentMethod: 'Lain-lain' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight">Dasbor</h1>
        <div className="w-full md:w-auto">
           <DateRangePicker date={date} onDateChange={setDate} align="end" />
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Pendapatan"
          value={formatCurrency(currentPeriodStats.totalRevenue)}
          icon={DollarSign}
          description="Total dari penjualan UMUM"
          color="bg-green-100 dark:bg-green-800/50"
        />
        <StatCard
          title="Total Pengeluaran"
          value={formatCurrency(currentPeriodStats.totalExpenditure)}
          icon={DollarSign}
          description="Total dari BPJS & Lain-lain"
           color="bg-red-100 dark:bg-red-800/50"
        />
        <StatCard
          title="Total Transaksi"
          value={currentPeriodStats.totalTransactions.toString()}
          icon={ReceiptText}
          description="Jumlah total semua penjualan"
           color="bg-blue-100 dark:bg-blue-800/50"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
            <MonthlyRevenueChart data={chartData} />
        </div>
         <div className="lg:col-span-2">
           <Card>
             <CardHeader>
               <CardTitle>Pengeluaran BPJS RJ Teratas</CardTitle>
               <CardDescription>5 transaksi pengeluaran terbesar untuk Rawat Jalan BPJS.</CardDescription>
             </CardHeader>
             <CardContent>
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Deskripsi</TableHead>
                     <TableHead className="text-right">Jumlah</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                  {topBpjsExpenditures.length > 0 ? (
                    topBpjsExpenditures.map(t => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div className="font-medium max-w-xs truncate">{t.medicationName}</div>
                          <div className="text-sm text-muted-foreground">{t.date}</div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(t.totalPrice)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                       <TableCell colSpan={2} className="h-24 text-center">
                          Tidak ada data.
                       </TableCell>
                    </TableRow>
                  )}
                 </TableBody>
               </Table>
             </CardContent>
           </Card>
        </div>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>Analisis Pendapatan & Pengeluaran</CardTitle>
            <CardDescription>Rincian perbandingan performa berdasarkan kategori.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Kategori</TableHead>
                        <TableHead className="text-right">Total Nilai</TableHead>
                        <TableHead className="text-right">Jumlah Transaksi</TableHead>
                        <TableHead className="text-right">% Perubahan Nilai</TableHead>
                        <TableHead className="text-right">% Perubahan Transaksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {detailCategories.map(({ key, label }) => {
                    const current = currentPeriodStats.details[key];
                    const previous = previousPeriodStats.details[key];
                    if (!current || current.transactions === 0) return null;

                    return (
                       <TableRow key={key}>
                          <TableCell className="font-medium">{label}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(current.revenue)}</TableCell>
                          <TableCell className="text-right font-semibold">{current.transactions}</TableCell>
                          <TableCell className="text-right">
                              <PercentageChange change={getPercentageChange(current.revenue, previous?.revenue || 0)} />
                          </TableCell>
                          <TableCell className="text-right">
                              <PercentageChange change={getPercentageChange(current.transactions, previous?.transactions || 0)} />
                          </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopSellingItems 
          title="Obat Terlaris (Penjualan UMUM)"
          transactions={transactions.filter(t => t.paymentMethod === 'UMUM')}
          inventory={inventory}
          itemType="Obat"
          icon={Pill}
        />
        <TopSellingItems 
          title="Alkes Terlaris (Penjualan UMUM)"
          transactions={transactions.filter(t => t.paymentMethod === 'UMUM')}
          inventory={inventory}
          itemType="Alkes"
          icon={Stethoscope}
        />
      </div>
    </div>
  );
}
