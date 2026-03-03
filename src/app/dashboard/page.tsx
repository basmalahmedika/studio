'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { subDays, differenceInDays } from 'date-fns';
import { DollarSign, ReceiptText, Pill, Stethoscope } from 'lucide-react';

import { StatCard } from '@/components/stat-card';
import { TopSellingItems } from '@/components/top-selling-items';
import { useAppContext } from '@/context/app-context';
import type { Transaction, InventoryItem } from '@/lib/types';
import { SalesTrendsChart } from '@/components/sales-trends-chart';
import { CategoryBreakdownChart } from '@/components/category-breakdown-chart';
import { CardFooter } from '@/components/ui/card';
import { BpjsExpenditureAnalysis } from '@/components/bpjs-expenditure-analysis';
import { TransactionDetailsDialog } from '@/components/transaction-details-dialog';

const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

const AnalysisFooter = ({ title, currentTotal, previousTotal }: { title: string, currentTotal: number, previousTotal: number }) => {
    const difference = currentTotal - previousTotal;
    const percentageChange = previousTotal !== 0 ? (difference / previousTotal) * 100 : (currentTotal > 0 ? 100 : 0);
    const isIncrease = difference >= 0;

    return (
        <CardFooter>
            <div className="text-xs text-muted-foreground">
                <span className="font-bold">{title}</span> bulan ini adalah <span className="font-bold">{formatCurrency(currentTotal)}</span>.
                {previousTotal > 0 && (
                    <>
                        {' Dibandingkan dengan '}
                        <span className="font-bold">{formatCurrency(previousTotal)}</span>
                        {' bulan lalu, ada '}
                        <span className={`font-bold ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                            {isIncrease ? 'kenaikan' : 'penurunan'} sebesar {Math.abs(percentageChange).toFixed(1)}%
                        </span>
                        .
                    </>
                )}
            </div>
        </CardFooter>
    );
};

export default function DashboardPage() {
  const { transactions, inventory, filters } = useAppContext();

  const {
    revenueComparisonData,
    expenditureComparisonData,
    categoryChartDataRJ,
    categoryChartDataRI,
    currentPeriodStats,
    previousPeriodStats,
    transactionsForStats,
  } = React.useMemo(() => {

    const parseDateUTC = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const parseStringUTC = (dateString: string) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) throw new Error();
            return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
        } catch (e) {
            const parts = dateString.split('-').map(Number);
            if (parts.length !== 3 || parts.some(isNaN)) return 0;
            const [year, month, day] = parts;
            return Date.UTC(year, month - 1, day);
        }
    };

    const filterTransactionsByCriteria = (
        data: Transaction[], 
        dateRange: DateRange | undefined, 
        patientType: string, 
        paymentMethod: string
    ) => {
        const fromDateUTC = dateRange?.from ? parseDateUTC(dateRange.from) : null;
        const toDateUTC = dateRange?.to ? parseDateUTC(dateRange.to) : null;

        return data.filter(t => {
            const transactionDateUTC = parseStringUTC(t.date);
            if (transactionDateUTC === 0) return false;

            const isDateInRange = fromDateUTC && toDateUTC
                ? transactionDateUTC >= fromDateUTC && transactionDateUTC <= toDateUTC
                : true;
            
            const isPatientTypeMatch = patientType === 'all' || t.patientType === patientType;
            const isPaymentMethodMatch = paymentMethod === 'all' || t.paymentMethod === paymentMethod;

            return isDateInRange && isPatientTypeMatch && isPaymentMethodMatch;
        });
    };
    
    // --- 1. Filter for CURRENT period ---
    const filteredTransactions = filterTransactionsByCriteria(
        transactions,
        filters.date,
        filters.patientType,
        filters.paymentMethod
    );

    // --- 2. Filter for PREVIOUS period ---
    const duration = filters.date?.from && filters.date.to ? differenceInDays(filters.date.to, filters.date.from) : 30;
    const prevDateRange: DateRange = {
        from: filters.date?.from ? subDays(filters.date.from, duration + 1) : subDays(new Date(), (duration * 2) + 1),
        to: filters.date?.from ? subDays(filters.date.from, 1) : subDays(new Date(), duration + 1),
    };
    const previousFilteredTransactions = filterTransactionsByCriteria(
        transactions,
        prevDateRange,
        filters.patientType,
        filters.paymentMethod
    );
    
    // --- 3. Calculate all stats and chart data directly from the filtered sources ---

    // Helper functions
    const getRevenue = (trans: Transaction[]) => trans.reduce((sum, t) => sum + t.totalPrice, 0);
    const getExpenditure = (trans: Transaction[]) => trans.reduce((sum, t) => {
        return sum + (t.items || []).reduce((itemSum, item) => {
            const inventoryItem = inventory.find(inv => inv.id === item.itemId);
            return itemSum + (inventoryItem?.purchasePrice || 0) * item.quantity;
        }, 0);
    }, 0);

    // Stat Card Data
    const allUmumCurrent = filteredTransactions.filter(t => t.paymentMethod === 'UMUM');
    const allNonUmumCurrent = filteredTransactions.filter(t => t.paymentMethod !== 'UMUM');
    
    const rjUmumCurrent = allUmumCurrent.filter(t => t.patientType === 'Rawat Jalan');
    const riUmumCurrent = allUmumCurrent.filter(t => t.patientType === 'Rawat Inap');
    
    const allBpjsCurrent = filteredTransactions.filter(t => t.paymentMethod === 'BPJS');
    const rjBpjsCurrent = allBpjsCurrent.filter(t => t.patientType === 'Rawat Jalan');
    const riBpjsCurrent = allBpjsCurrent.filter(t => t.patientType === 'Rawat Inap');
    
    const currentPeriodStats = {
      totalRevenue: getRevenue(allUmumCurrent),
      revenueRJ: getRevenue(rjUmumCurrent),
      revenueRI: getRevenue(riUmumCurrent),
      totalExpenditure: getExpenditure(allNonUmumCurrent),
      countRjUmum: rjUmumCurrent.length,
      countRiUmum: riUmumCurrent.length,
      countRjBpjs: rjBpjsCurrent.length,
      countRiBpjs: riBpjsCurrent.length,
    };

    const transactionsForStats = {
        rjUmum: rjUmumCurrent,
        riUmum: riUmumCurrent,
        rjBpjs: rjBpjsCurrent,
        riBpjs: riBpjsCurrent,
    };
    
    // Previous Period Stats
    const previousPeriodStats = {
        totalRevenue: getRevenue(previousFilteredTransactions.filter(t => t.paymentMethod === 'UMUM')),
        totalExpenditure: getExpenditure(previousFilteredTransactions.filter(t => t.paymentMethod !== 'UMUM')),
    };

    // Monthly Comparison Chart Data
    const calculateMonthlyComparison = (currentTrans: Transaction[], previousTrans: Transaction[]) => {
        const currentSales: Record<string, number> = {};
        const previousSales: Record<string, number> = {};

        const process = (trans: Transaction[], salesMap: Record<string, number>, type: 'revenue' | 'expenditure') => {
            trans.forEach(t => {
                const month = new Date(t.date).toLocaleString('default', { month: 'short', year: 'numeric' });
                let monthTotal = 0;
                if (type === 'revenue' && t.paymentMethod === 'UMUM') {
                    monthTotal = t.totalPrice;
                } else if (type === 'expenditure' && t.paymentMethod !== 'UMUM') {
                    monthTotal = getExpenditure([t]);
                }
                if (monthTotal > 0) salesMap[month] = (salesMap[month] || 0) + monthTotal;
            });
        };

        const allMonths = new Set<string>();
        [...currentTrans, ...previousTrans].forEach(t => allMonths.add(new Date(t.date).toLocaleString('default', { month: 'short', year: 'numeric' })));
        const sortedMonths = Array.from(allMonths).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        const getComparisonData = (type: 'revenue' | 'expenditure') => {
            const currentSales: Record<string, number> = {};
            const previousSales: Record<string, number> = {};
            process(currentTrans, currentSales, type);
            process(previousTrans, previousSales, type);
            return sortedMonths.map(month => ({
                name: month,
                current: currentSales[month] || 0,
                previous: previousSales[month] || 0,
            }));
        };

        return {
            revenue: getComparisonData('revenue'),
            expenditure: getComparisonData('expenditure'),
        };
    };
    
    const comparisonData = calculateMonthlyComparison(filteredTransactions, previousFilteredTransactions);
    const revenueComparisonData = comparisonData.revenue;
    const expenditureComparisonData = comparisonData.expenditure;

    // Category Breakdown Chart Data
    const previousRjUmum = previousFilteredTransactions.filter(t => t.patientType === 'Rawat Jalan' && t.paymentMethod === 'UMUM');
    const previousRiUmum = previousFilteredTransactions.filter(t => t.patientType === 'Rawat Inap' && t.paymentMethod === 'UMUM');
    const previousRjBpjs = previousFilteredTransactions.filter(t => t.patientType === 'Rawat Jalan' && t.paymentMethod === 'BPJS');
    const previousRiBpjs = previousFilteredTransactions.filter(t => t.patientType === 'Rawat Inap' && t.paymentMethod === 'BPJS');

    const categoryChartDataRJ = [
        { name: 'Periode Ini', umum: getRevenue(rjUmumCurrent), bpjs: getExpenditure(rjBpjsCurrent) },
        { name: 'Periode Lalu', umum: getRevenue(previousRjUmum), bpjs: getExpenditure(previousRjBpjs) }
    ];
    const categoryChartDataRI = [
        { name: 'Periode Ini', umum: getRevenue(riUmumCurrent), bpjs: getExpenditure(riBpjsCurrent) },
        { name: 'Periode Lalu', umum: getRevenue(previousRiUmum), bpjs: getExpenditure(previousRiBpjs) }
    ];

    return {
        revenueComparisonData,
        expenditureComparisonData,
        categoryChartDataRJ,
        categoryChartDataRI,
        currentPeriodStats,
        previousPeriodStats,
        transactionsForStats,
    };
  }, [filters, transactions, inventory]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-headline font-bold tracking-tight">Dasbor</h1>
        <p className="text-muted-foreground">
            Ringkasan data berdasarkan filter global yang dipilih.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Pendapatan (UMUM)"
          value={formatCurrency(currentPeriodStats.totalRevenue)}
          icon={DollarSign}
          description="Total dari semua penjualan UMUM"
          className="bg-green-600/90 text-white"
        />
        <StatCard
          title="Pendapatan RJ (UMUM)"
          value={formatCurrency(currentPeriodStats.revenueRJ)}
          icon={Pill}
          description="Pendapatan dari pasien Rawat Jalan UMUM"
          className="bg-green-600/90 text-white"
        />
        <StatCard
          title="Pendapatan RI (UMUM)"
          value={formatCurrency(currentPeriodStats.revenueRI)}
          icon={Pill}
          description="Pendapatan dari pasien Rawat Inap UMUM"
          className="bg-green-600/90 text-white"
        />
         <StatCard
          title="Total Pengeluaran (Non-UMUM)"
          value={formatCurrency(currentPeriodStats.totalExpenditure)}
          icon={Stethoscope}
          description="Pengeluaran untuk pasien BPJS & Lain-lain"
          className="bg-orange-500/90 text-white"
        />
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <TransactionDetailsDialog transactions={transactionsForStats.rjUmum} inventory={inventory} title="Detail Transaksi RJ (UMUM)">
          <StatCard
            title="Transaksi RJ (UMUM)"
            value={currentPeriodStats.countRjUmum.toString()}
            icon={ReceiptText}
            description="Jml. transaksi Rawat Jalan UMUM"
            className="bg-blue-600/90 text-white hover:bg-blue-600/80 cursor-pointer"
          />
        </TransactionDetailsDialog>
        <TransactionDetailsDialog transactions={transactionsForStats.rjBpjs} inventory={inventory} title="Detail Transaksi RJ (BPJS)">
          <StatCard
            title="Transaksi RJ (BPJS)"
            value={currentPeriodStats.countRjBpjs.toString()}
            icon={ReceiptText}
            description="Jml. transaksi Rawat Jalan BPJS"
            className="bg-blue-600/90 text-white hover:bg-blue-600/80 cursor-pointer"
          />
        </TransactionDetailsDialog>
        <TransactionDetailsDialog transactions={transactionsForStats.riUmum} inventory={inventory} title="Detail Transaksi RI (UMUM)">
          <StatCard
            title="Transaksi RI (UMUM)"
            value={currentPeriodStats.countRiUmum.toString()}
            icon={ReceiptText}
            description="Jml. transaksi Rawat Inap UMUM"
            className="bg-blue-600/90 text-white hover:bg-blue-600/80 cursor-pointer"
          />
        </TransactionDetailsDialog>
        <TransactionDetailsDialog transactions={transactionsForStats.riBpjs} inventory={inventory} title="Detail Transaksi RI (BPJS)">
          <StatCard
            title="Transaksi RI (BPJS)"
            value={currentPeriodStats.countRiBpjs.toString()}
            icon={ReceiptText}
            description="Jml. transaksi Rawat Inap BPJS"
            className="bg-blue-600/90 text-white hover:bg-blue-600/80 cursor-pointer"
          />
        </TransactionDetailsDialog>
      </div>

      <BpjsExpenditureAnalysis />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesTrendsChart 
            title="Grafik Pendapatan (UMUM)" 
            data={revenueComparisonData}
            footer={
                <AnalysisFooter 
                    title="Total pendapatan"
                    currentTotal={currentPeriodStats.totalRevenue}
                    previousTotal={previousPeriodStats.totalRevenue}
                />
            }
        />
        <SalesTrendsChart 
            title="Grafik Pengeluaran (Non-UMUM)" 
            data={expenditureComparisonData} 
            footer={
                 <AnalysisFooter 
                    title="Total pengeluaran"
                    currentTotal={currentPeriodStats.totalExpenditure}
                    previousTotal={previousPeriodStats.totalExpenditure}
                />
            }
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
      
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopSellingItems 
          title="Obat Terlaris (Penjualan UMUM)"
          transactions={transactionsForStats.rjUmum.concat(transactionsForStats.riUmum)}
          inventory={inventory}
          itemType="Obat"
          icon={Pill}
        />
        <TopSellingItems 
          title="Alkes Terlaris (Penjualan UMUM)"
          transactions={transactionsForStats.rjUmum.concat(transactionsForStats.riUmum)}
          inventory={inventory}
          itemType="Alkes"
          icon={Stethoscope}
        />
      </div>
    </div>
  );
}
