
'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useAppContext } from '@/context/app-context';
import type { Transaction } from '@/lib/types';
import { SalesTrendsChart } from '@/components/sales-trends-chart';
import { AbcAnalysis } from '@/components/abc-analysis';
import { ProfitAnalysisReport } from '@/components/profit-analysis-report';
import { SupplierPriceAnalysis } from '@/components/supplier-price-analysis';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

interface MonthlyAverages {
  averageRJ: number;
  averageRI: number;
}

const calculateYearlyAverages = (
  transactions: Transaction[],
  year: number,
  inventory: any[],
  patientTypeFilter: string,
  paymentMethodFilter: string
): MonthlyAverages[] => {
  const monthlyAggregates: {
    [key: number]: {
      rjCost: number; rjCount: number;
      riCost: number; riCount: number;
    }
  } = {};

  for (let i = 0; i < 12; i++) {
    monthlyAggregates[i] = { rjCost: 0, rjCount: 0, riCost: 0, riCount: 0 };
  }

  transactions
    .filter(t => {
        try {
            const transactionDate = new Date(t.date);
            const isYearMatch = transactionDate.getFullYear() === year;
            const isPatientTypeMatch = patientTypeFilter === 'all' || t.patientType === patientTypeFilter;
            const isPaymentMethodMatch = paymentMethodFilter === 'all' || t.paymentMethod === paymentMethodFilter;
            return isYearMatch && t.paymentMethod === 'BPJS' && isPatientTypeMatch && isPaymentMethodMatch;
        } catch (e) {
            return false;
        }
    })
    .forEach(t => {
      const month = new Date(t.date).getMonth();
      
      const transactionCost = (t.items || []).reduce((sum, item) => {
        const inventoryItem = inventory.find(inv => inv.id === item.itemId);
        return sum + (inventoryItem?.purchasePrice || 0) * item.quantity;
      }, 0);

      if (t.patientType === 'Rawat Jalan') {
        monthlyAggregates[month].rjCost += transactionCost;
        monthlyAggregates[month].rjCount += 1;
      } else if (t.patientType === 'Rawat Inap') {
        monthlyAggregates[month].riCost += transactionCost;
        monthlyAggregates[month].riCount += 1;
      }
    });

  const yearlyData: MonthlyAverages[] = [];
  for (let i = 0; i < 12; i++) {
    const data = monthlyAggregates[i];
    yearlyData[i] = {
      averageRJ: data.rjCount > 0 ? data.rjCost / data.rjCount : 0,
      averageRI: data.riCount > 0 ? data.riCost / data.riCount : 0,
    };
  }

  return yearlyData;
};


export default function AnalysisPage() {
  const { transactions, inventory, filters } = useAppContext();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = React.useState(currentYear);
  const [comparisonYear, setComparisonYear] = React.useState(currentYear - 1);

  const availableYears = React.useMemo(() => {
    const years = new Set(transactions.map(t => {
        try {
            return new Date(t.date).getFullYear();
        } catch(e) {
            return 0;
        }
    }).filter(y => y > 0));
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  const selectedYearData = React.useMemo(() => 
    calculateYearlyAverages(transactions, selectedYear, inventory, filters.patientType, filters.paymentMethod),
    [transactions, selectedYear, inventory, filters]
  );
  
  const comparisonYearData = React.useMemo(() =>
    calculateYearlyAverages(transactions, comparisonYear, inventory, filters.patientType, filters.paymentMethod),
    [transactions, comparisonYear, inventory, filters]
  );
  
  const chartDataRJ = React.useMemo(() => {
    return MONTHS.map((month, index) => ({
      name: month,
      current: selectedYearData[index].averageRJ,
      previous: comparisonYearData[index].averageRJ,
    }));
  }, [selectedYearData, comparisonYearData]);
  
  const chartDataRI = React.useMemo(() => {
    return MONTHS.map((month, index) => ({
      name: month,
      current: selectedYearData[index].averageRI,
      previous: comparisonYearData[index].averageRI,
    }));
  }, [selectedYearData, comparisonYearData]);


  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-headline font-bold tracking-tight">Analisis Lanjutan</h1>
        <p className="text-muted-foreground">
          Analisis mendalam mengenai profit, klasifikasi item, dan perbandingan performa tahunan.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pilih Tahun Utama</label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Tahun" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
              <label className="text-sm font-medium">Pilih Tahun Pembanding</label>
              <Select
                value={comparisonYear.toString()}
                onValueChange={(value) => setComparisonYear(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Tahun Pembanding" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesTrendsChart 
          title={`Perbandingan Rata-rata Pengeluaran BPJS RJ (${comparisonYear} vs ${selectedYear})`}
          data={chartDataRJ} 
          currentLabel={selectedYear.toString()}
          previousLabel={comparisonYear.toString()}
        />
        <SalesTrendsChart 
          title={`Perbandingan Rata-rata Pengeluaran BPJS RI (${comparisonYear} vs ${selectedYear})`}
          data={chartDataRI} 
          currentLabel={selectedYear.toString()}
          previousLabel={comparisonYear.toString()}
        />
      </div>
      
       <div className="space-y-6">
        <ProfitAnalysisReport />
        <AbcAnalysis transactions={transactions} itemTypeFilter={'all'} />
        <SupplierPriceAnalysis inventory={inventory} />
      </div>

    </div>
  );
}

    