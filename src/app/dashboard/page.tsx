
'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { startOfMonth, subDays, differenceInDays } from 'date-fns';
import { DollarSign, ReceiptText, Users, Pill, Stethoscope } from 'lucide-react';

import { StatCard } from '@/components/stat-card';
import { RecentTransactions } from '@/components/recent-transactions';
import { TopSellingItems } from '@/components/top-selling-items';
import { DateRangePicker } from '@/components/date-range-picker';
import { useAppContext } from '@/context/app-context';
import type { Transaction } from '@/lib/types';
import { MonthlyTrendChart } from '@/components/monthly-trend-chart';
import { CategoryAnalysisChart } from '@/components/category-analysis-chart';
import { TopBpjsExpenditures } from '@/components/top-bpjs-expenditures';

interface DetailedStats {
  revenue: number;
  expenditure: number;
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
        'Rawat Jalan': { revenue: 0, expenditure: 0, transactions: 0 },
        'Rawat Inap': { revenue: 0, expenditure: 0, transactions: 0 },
        'Lain-lain': { revenue: 0, expenditure: 0, transactions: 0 },
      },
    };

    transactions.forEach(t => {
      stats.totalTransactions += 1;
      const key = t.patientType;
      
      if (stats.details[key]) {
        stats.details[key].transactions += 1;
      }
      
      if (t.paymentMethod === 'UMUM') {
        stats.totalRevenue += t.totalPrice;
        if(stats.details[key]) stats.details[key].revenue += t.totalPrice;
      } else {
        stats.totalExpenditure += t.totalPrice;
        if(stats.details[key]) stats.details[key].expenditure += t.totalPrice;
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
  
  const { filteredTransactions, currentPeriodStats, revenueChartData, expenditureChartData, categoryChartData } = React.useMemo(() => {
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
    const currentStats = calculateStats(currentFiltered);

    // Chart data calculation
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

    const categoryData = [
      { name: 'Rawat Jalan', revenue: currentStats.details['Rawat Jalan'].revenue, expenditure: currentStats.details['Rawat Jalan'].expenditure },
      { name: 'Rawat Inap', revenue: currentStats.details['Rawat Inap'].revenue, expenditure: currentStats.details['Rawat Inap'].expenditure },
      { name: 'Lain-lain', revenue: currentStats.details['Lain-lain'].revenue, expenditure: currentStats.details['Lain-lain'].expenditure },
    ];
      
    return {
        filteredTransactions: currentFiltered,
        currentPeriodStats: currentStats,
        revenueChartData: revenueData,
        expenditureChartData: expenditureData,
        categoryChartData: categoryData,
    };

  }, [date, transactions]);
  
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
            description="Tren pengeluaran dari BPJS & Lain-lain per bulan."
            data={expenditureChartData}
            dataKey="total"
            chartColor="hsl(var(--chart-2))"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
           <CategoryAnalysisChart data={categoryChartData} />
        </div>
         <div className="lg:col-span-2">
           <TopBpjsExpenditures transactions={filteredTransactions} />
        </div>
      </div>
      
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTransactions transactions={filteredTransactions} />
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
