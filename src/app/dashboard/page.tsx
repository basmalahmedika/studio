
'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { startOfMonth, subDays, differenceInDays } from 'date-fns';
import { DollarSign, ReceiptText, Pill, Stethoscope } from 'lucide-react';

import { StatCard } from '@/components/stat-card';
import { RecentTransactions } from '@/components/recent-transactions';
import { TopSellingItems } from '@/components/top-selling-items';
import { DateRangePicker } from '@/components/date-range-picker';
import { useAppContext } from '@/context/app-context';
import type { Transaction } from '@/lib/types';
import { MonthlyTrendChart } from '@/components/monthly-trend-chart';
import { CategoryBreakdownChart } from '@/components/category-breakdown-chart';
import { TopBpjsExpenditures } from '@/components/top-bpjs-expenditures';

interface DetailedStats {
  revenueRJ: number;
  revenueRI: number;
  expenditureRJ: number;
  expenditureRI: number;
}

interface CategoryBreakdown {
  rjUmum: number;
  rjBpjs: number;
  riUmum: number;
  riBpjs: number;
}

interface AllStats {
  totalRevenue: number;
  totalExpenditure: number;
  totalTransactions: number;
  details: DetailedStats;
  categoryBreakdown: CategoryBreakdown;
}

const calculateStats = (transactions: Transaction[]): AllStats => {
    const stats: AllStats = {
      totalRevenue: 0,
      totalExpenditure: 0,
      totalTransactions: 0,
      details: {
        revenueRJ: 0,
        revenueRI: 0,
        expenditureRJ: 0,
        expenditureRI: 0,
      },
      categoryBreakdown: {
        rjUmum: 0,
        rjBpjs: 0,
        riUmum: 0,
        riBpjs: 0,
      }
    };

    transactions.forEach(t => {
      stats.totalTransactions += 1;
      
      const isRJ = t.patientType === 'Rawat Jalan';
      const isRI = t.patientType === 'Rawat Inap';

      if (t.paymentMethod === 'UMUM') {
        stats.totalRevenue += t.totalPrice;
        if (isRJ) {
            stats.details.revenueRJ += t.totalPrice;
            stats.categoryBreakdown.rjUmum += t.totalPrice;
        } else if (isRI) {
            stats.details.revenueRI += t.totalPrice;
            stats.categoryBreakdown.riUmum += t.totalPrice;
        }
      } else { 
        stats.totalExpenditure += t.totalPrice;
        if(t.paymentMethod === 'BPJS') {
             if (isRJ) {
                stats.details.expenditureRJ += t.totalPrice;
                stats.categoryBreakdown.rjBpjs += t.totalPrice;
            } else if (isRI) {
                stats.details.expenditureRI += t.totalPrice;
                stats.categoryBreakdown.riBpjs += t.totalPrice;
            }
        }
      }
    });

    return stats;
};

const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

export default function DashboardPage() {
  const { transactions, inventory } = useAppContext();

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  
  const { 
    filteredTransactions, 
    revenueChartData, 
    expenditureChartData,
    categoryChartDataRJ,
    categoryChartDataRI,
  } = React.useMemo(() => {
    const filterTransactions = (range: DateRange | undefined): Transaction[] => {
        return transactions.filter(t => {
            const transactionDate = new Date(t.date);
            transactionDate.setHours(0, 0, 0, 0);
            const fromDate = range?.from ? new Date(range.from) : null;
            if (fromDate) fromDate.setHours(0, 0, 0, 0);
            const toDate = range?.to ? new Date(range.to) : null;
            if (toDate) toDate.setHours(0, 0, 0, 0);
            return fromDate && toDate ? transactionDate >= fromDate && transactionDate <= toDate : true;
        });
    };

    const currentFiltered = filterTransactions(date);
    
    // Calculate previous period
    const duration = date?.from && date.to ? differenceInDays(date.to, date.from) : 30;
    const prevDate = {
      from: date?.from ? subDays(date.from, duration + 1) : subDays(new Date(), (duration * 2) + 1),
      to: date?.from ? subDays(date.from, 1) : subDays(new Date(), duration + 1),
    };
    const previousFiltered = filterTransactions(prevDate);
    
    const currentStats = calculateStats(currentFiltered);
    const previousStats = calculateStats(previousFiltered);

    // Monthly Trend Chart Data
    const monthlyRevenue: Record<string, number> = {};
    const monthlyExpenditure: Record<string, number> = {};
    
    currentFiltered.forEach(t => {
        const month = new Date(t.date).toLocaleString('default', { month: 'short', year: 'numeric' });
        if (t.paymentMethod === 'UMUM') {
            monthlyRevenue[month] = (monthlyRevenue[month] || 0) + t.totalPrice;
        } else {
            monthlyExpenditure[month] = (monthlyExpenditure[month] || 0) + t.totalPrice;
        }
    });
    
    const revenueData = Object.entries(monthlyRevenue)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

    const expenditureData = Object.entries(monthlyExpenditure)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

    // Category Breakdown Chart Data
    const rjData = [
        { name: 'Periode Ini', umum: currentStats.categoryBreakdown.rjUmum, bpjs: currentStats.categoryBreakdown.rjBpjs },
        { name: 'Periode Lalu', umum: previousStats.categoryBreakdown.rjUmum, bpjs: previousStats.categoryBreakdown.rjBpjs }
    ];
    const riData = [
        { name: 'Periode Ini', umum: currentStats.categoryBreakdown.riUmum, bpjs: currentStats.categoryBreakdown.riBpjs },
        { name: 'Periode Lalu', umum: previousStats.categoryBreakdown.riUmum, bpjs: previousStats.categoryBreakdown.riBpjs }
    ];
      
    return {
        filteredTransactions: currentFiltered,
        revenueChartData: revenueData,
        expenditureChartData: expenditureData,
        categoryChartDataRJ: rjData,
        categoryChartDataRI: riData
    };

  }, [date, transactions]);
  
  const currentPeriodStats = calculateStats(filteredTransactions);

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
          description="Total dari BPJS &amp; Lain-lain"
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

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pendapatan RJ (UMUM)"
          value={formatCurrency(currentPeriodStats.details.revenueRJ)}
          icon={Pill}
          description="Pendapatan dari pasien Rawat Jalan UMUM"
          color="bg-emerald-100 dark:bg-emerald-800/50"
        />
        <StatCard
          title="Pendapatan RI (UMUM)"
          value={formatCurrency(currentPeriodStats.details.revenueRI)}
          icon={Pill}
          description="Pendapatan dari pasien Rawat Inap UMUM"
          color="bg-emerald-100 dark:bg-emerald-800/50"
        />
         <StatCard
          title="Pengeluaran RJ (BPJS)"
          value={formatCurrency(currentPeriodStats.details.expenditureRJ)}
          icon={Stethoscope}
          description="Pengeluaran untuk pasien Rawat Jalan BPJS"
          color="bg-teal-100 dark:bg-teal-800/50"
        />
         <StatCard
          title="Pengeluaran RI (BPJS)"
          value={formatCurrency(currentPeriodStats.details.expenditureRI)}
          icon={Stethoscope}
          description="Pengeluaran untuk pasien Rawat Inap BPJS"
          color="bg-teal-100 dark:bg-teal-800/50"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyTrendChart 
            title="Grafik Pendapatan"
            description="Tren pendapatan dari penjualan UMUM per bulan."
            data={revenueChartData}
            dataKey="total"
            chartColor="hsl(var(--chart-1))"
        />
        <MonthlyTrendChart 
            title="Grafik Pengeluaran"
            description="Tren pengeluaran dari BPJS &amp; Lain-lain per bulan."
            data={expenditureChartData}
            dataKey="total"
            chartColor="hsl(var(--chart-2))"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <CategoryBreakdownChart 
            title="Analisis Rawat Jalan"
            description="Perbandingan UMUM vs BPJS untuk pasien Rawat Jalan"
            data={categoryChartDataRJ}
         />
         <CategoryBreakdownChart 
            title="Analisis Rawat Inap"
            description="Perbandingan UMUM vs BPJS untuk pasien Rawat Inap"
            data={categoryChartDataRI}
         />
      </div>
       <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
            <RecentTransactions transactions={filteredTransactions} />
        </div>
         <div className="lg:col-span-2">
           <TopBpjsExpenditures transactions={filteredTransactions} />
        </div>
      </div>
      
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
