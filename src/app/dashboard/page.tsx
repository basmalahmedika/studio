
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

interface TransactionCounts {
  rjUmum: number;
  rjBpjs: number;
  riUmum: number;
  riBpjs: number;
}

interface AllStats {
  totalRevenue: number;
  transactionCounts: TransactionCounts;
  details: DetailedStats;
  categoryBreakdown: CategoryBreakdown;
  totalExpenditure: number; 
}

const calculateStats = (transactions: Transaction[], inventory: InventoryItem[]): AllStats => {
    const stats: AllStats = {
      totalRevenue: 0,
      transactionCounts: {
        rjUmum: 0,
        rjBpjs: 0,
        riUmum: 0,
        riBpjs: 0,
      },
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
      },
      totalExpenditure: 0,
    };

    const uniqueTransactionIds = new Set<string>();

    transactions.forEach(t => {
      // Count transactions based on type and payment method
      if (!uniqueTransactionIds.has(t.id)) {
         if (t.patientType === 'Rawat Jalan') {
            if (t.paymentMethod === 'UMUM') stats.transactionCounts.rjUmum += 1;
            else if (t.paymentMethod === 'BPJS') stats.transactionCounts.rjBpjs += 1;
         } else if (t.patientType === 'Rawat Inap') {
            if (t.paymentMethod === 'UMUM') stats.transactionCounts.riUmum += 1;
            else if (t.paymentMethod === 'BPJS') stats.transactionCounts.riBpjs += 1;
         }
        uniqueTransactionIds.add(t.id);
      }
      
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
        let transactionCost = 0;
        t.items?.forEach(item => {
          const inventoryItem = inventory.find(inv => inv.id === item.itemId);
          transactionCost += (inventoryItem?.purchasePrice || 0) * item.quantity;
        });

        stats.totalExpenditure += transactionCost;

        if(t.paymentMethod === 'BPJS') {
             if (isRJ) {
                stats.details.expenditureRJ += transactionCost;
                stats.categoryBreakdown.rjBpjs += transactionCost;
            } else if (isRI) {
                stats.details.expenditureRI += transactionCost;
                stats.categoryBreakdown.riBpjs += transactionCost;
            }
        }
      }
    });

    return stats;
};

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
    filteredTransactions,
  } = React.useMemo(() => {
    const filterTransactionsByRange = (trans: Transaction[], range: DateRange | undefined, patientType: string, paymentMethod: string): Transaction[] => {
        if (!range || !range.from || !range.to) return [];
        return trans.filter(t => {
            const transactionDate = new Date(t.date);
            transactionDate.setHours(0, 0, 0, 0);
            const fromDate = new Date(range.from!);
            fromDate.setHours(0, 0, 0, 0);
            const toDate = new Date(range.to!);
            toDate.setHours(0, 0, 0, 0);

            const isDateInRange = transactionDate >= fromDate && transactionDate <= toDate;
            const isPatientTypeMatch = patientType === 'all' || t.patientType === patientType;
            const isPaymentMethodMatch = paymentMethod === 'all' || t.paymentMethod === paymentMethod;
            
            return isDateInRange && isPatientTypeMatch && isPaymentMethodMatch;
        });
    };

    const currentFiltered = filterTransactionsByRange(transactions, filters.date, filters.patientType, filters.paymentMethod);
    
    const duration = filters.date?.from && filters.date.to ? differenceInDays(filters.date.to, filters.date.from) : 30;
    const prevDate = {
      from: filters.date?.from ? subDays(filters.date.from, duration + 1) : subDays(new Date(), (duration * 2) + 1),
      to: filters.date?.from ? subDays(filters.date.from, 1) : subDays(new Date(), duration + 1),
    };
    const previousFiltered = filterTransactionsByRange(transactions, prevDate, filters.patientType, filters.paymentMethod);
    
    const currentStats = calculateStats(currentFiltered, inventory);
    const previousStats = calculateStats(previousFiltered, inventory);

    const calculateMonthlyComparison = (currentTrans: Transaction[], previousTrans: Transaction[], type: 'revenue' | 'expenditure') => {
        const currentSales: Record<string, number> = {};
        const previousSales: Record<string, number> = {};

        const processTransactions = (trans: Transaction[], salesMap: Record<string, number>) => {
            trans.forEach(t => {
                const month = new Date(t.date).toLocaleString('default', { month: 'short', year: 'numeric' });
                let monthTotal = 0;
                
                if (type === 'revenue' && t.paymentMethod === 'UMUM') {
                    monthTotal = t.totalPrice;
                } else if (type === 'expenditure' && t.paymentMethod !== 'UMUM') {
                    let transactionCost = 0;
                    t.items?.forEach(item => {
                        const inventoryItem = inventory.find(inv => inv.id === item.itemId);
                        transactionCost += (inventoryItem?.purchasePrice || 0) * item.quantity;
                    });
                    monthTotal = transactionCost;
                }
                salesMap[month] = (salesMap[month] || 0) + monthTotal;
            });
        };

        processTransactions(currentTrans, currentSales);
        processTransactions(previousTrans, previousSales);
        
        const allMonths = new Set([...Object.keys(currentSales), ...Object.keys(previousSales)]);
        const sortedMonths = Array.from(allMonths).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        return sortedMonths.map(month => ({
            name: month,
            current: currentSales[month] || 0,
            previous: previousSales[month] || 0,
        }));
    };

    const rjData = [
        { name: 'Periode Ini', umum: currentStats.categoryBreakdown.rjUmum, bpjs: currentStats.categoryBreakdown.rjBpjs },
        { name: 'Periode Lalu', umum: previousStats.categoryBreakdown.rjUmum, bpjs: previousStats.categoryBreakdown.rjBpjs }
    ];
    const riData = [
        { name: 'Periode Ini', umum: currentStats.categoryBreakdown.riUmum, bpjs: currentStats.categoryBreakdown.riBpjs },
        { name: 'Periode Lalu', umum: previousStats.categoryBreakdown.riUmum, bpjs: previousStats.categoryBreakdown.riBpjs }
    ];
      
    return {
        revenueComparisonData: calculateMonthlyComparison(currentFiltered, previousFiltered, 'revenue'),
        expenditureComparisonData: calculateMonthlyComparison(currentFiltered, previousFiltered, 'expenditure'),
        categoryChartDataRJ: rjData,
        categoryChartDataRI: riData,
        currentPeriodStats: currentStats,
        previousPeriodStats: previousStats,
        filteredTransactions: currentFiltered,
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
          value={formatCurrency(currentPeriodStats.details.revenueRJ)}
          icon={Pill}
          description="Pendapatan dari pasien Rawat Jalan UMUM"
          className="bg-green-600/90 text-white"
        />
        <StatCard
          title="Pendapatan RI (UMUM)"
          value={formatCurrency(currentPeriodStats.details.revenueRI)}
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
        <StatCard
          title="Transaksi RJ (UMUM)"
          value={currentPeriodStats.transactionCounts.rjUmum.toString()}
          icon={ReceiptText}
          description="Jml. transaksi Rawat Jalan UMUM"
          className="bg-blue-600/90 text-white"
        />
         <StatCard
          title="Transaksi RJ (BPJS)"
          value={currentPeriodStats.transactionCounts.rjBpjs.toString()}
          icon={ReceiptText}
          description="Jml. transaksi Rawat Jalan BPJS"
          className="bg-blue-600/90 text-white"
        />
        <StatCard
          title="Transaksi RI (UMUM)"
          value={currentPeriodStats.transactionCounts.riUmum.toString()}
          icon={ReceiptText}
          description="Jml. transaksi Rawat Inap UMUM"
          className="bg-blue-600/90 text-white"
        />
         <StatCard
          title="Transaksi RI (BPJS)"
          value={currentPeriodStats.transactionCounts.riBpjs.toString()}
          icon={ReceiptText}
          description="Jml. transaksi Rawat Inap BPJS"
          className="bg-blue-600/90 text-white"
        />
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
          transactions={filteredTransactions.filter(t => t.paymentMethod === 'UMUM')}
          inventory={inventory}
          itemType="Obat"
          icon={Pill}
        />
        <TopSellingItems 
          title="Alkes Terlaris (Penjualan UMUM)"
          transactions={filteredTransactions.filter(t => t.paymentMethod === 'UMUM')}
          inventory={inventory}
          itemType="Alkes"
          icon={Stethoscope}
        />
      </div>
    </div>
  );
}

    