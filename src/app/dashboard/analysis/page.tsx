
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
  inventory: any[]
): MonthlyAverages[] => {
  const yearlyData: MonthlyAverages[] = Array(12).fill(0).map(() => ({
    averageRJ: 0,
    averageRI: 0,
  }));

  const monthlyAggregates: {
    [key: number]: {
      rjCost: number; rjCount: number;
      riCost: number; riCount: number;
    }
  } = {};

  transactions
    .filter(t => new Date(t.date).getFullYear() === year && t.paymentMethod === 'BPJS')
    .forEach(t => {
      const month = new Date(t.date).getMonth();
      if (!monthlyAggregates[month]) {
        monthlyAggregates[month] = { rjCost: 0, rjCount: 0, riCost: 0, riCount: 0 };
      }

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

  for (let i = 0; i < 12; i++) {
    const data = monthlyAggregates[i];
    if (data) {
      yearlyData[i] = {
        averageRJ: data.rjCount > 0 ? data.rjCost / data.rjCount : 0,
        averageRI: data.riCount > 0 ? data.riCost / data.riCount : 0,
      };
    }
  }

  return yearlyData;
};

export default function AnalysisPage() {
  const { transactions, inventory } = useAppContext();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = React.useState(currentYear);
  const [comparisonYear, setComparisonYear] = React.useState(currentYear - 1);

  const availableYears = React.useMemo(() => {
    const years = new Set(transactions.map(t => new Date(t.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  const chartDataRJ = React.useMemo(() => {
    const selectedYearData = calculateYearlyAverages(transactions, selectedYear, inventory);
    const comparisonYearData = calculateYearlyAverages(transactions, comparisonYear, inventory);

    return MONTHS.map((month, index) => ({
      name: month,
      current: selectedYearData[index].averageRJ,
      previous: comparisonYearData[index].averageRJ,
    }));
  }, [transactions, inventory, selectedYear, comparisonYear]);
  
  const chartDataRI = React.useMemo(() => {
    const selectedYearData = calculateYearlyAverages(transactions, selectedYear, inventory);
    const comparisonYearData = calculateYearlyAverages(transactions, comparisonYear, inventory);

    return MONTHS.map((month, index) => ({
      name: month,
      current: selectedYearData[index].averageRI,
      previous: comparisonYearData[index].averageRI,
    }));
  }, [transactions, inventory, selectedYear, comparisonYear]);


  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-headline font-bold tracking-tight">Analisis Perbandingan Tahunan</h1>
        <p className="text-muted-foreground">
          Bandingkan rata-rata pengeluaran BPJS bulanan antara dua tahun yang berbeda.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pilih Tahun</label>
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
        />
        <SalesTrendsChart 
          title={`Perbandingan Rata-rata Pengeluaran BPJS RI (${comparisonYear} vs ${selectedYear})`}
          data={chartDataRI} 
        />
      </div>
    </div>
  );
}
