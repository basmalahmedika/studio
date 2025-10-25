
'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { startOfMonth, differenceInDays, subDays } from 'date-fns';
import { AbcAnalysis } from '@/components/abc-analysis';
import { SalesTrendsChart } from '@/components/sales-trends-chart';
import { SupplierPriceAnalysis } from '@/components/supplier-price-analysis';
import { useAppContext } from '@/context/app-context';
import type { Transaction, InventoryItem, SalesData } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { DateRangePicker } from '@/components/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type PatientType = 'all' | 'Rawat Jalan' | 'Rawat Inap' | 'Lain-lain';
type PaymentMethod = 'all' | 'UMUM' | 'BPJS' | 'Lain-lain';
type ItemTypeFilter = 'all' | 'Obat' | 'Alkes';

const filterTransactionsByDate = (transactions: Transaction[], dateRange: DateRange | undefined) => {
  if (!dateRange || !dateRange.from || !dateRange.to) return transactions;
  
  return transactions.filter(t => {
      const transactionDate = new Date(t.date);
      transactionDate.setHours(0, 0, 0, 0);
      const fromDate = new Date(dateRange.from!);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(dateRange.to!);
      toDate.setHours(0, 0, 0, 0);
      return transactionDate >= fromDate && transactionDate <= toDate;
  });
};

const calculateMonthlySales = (
    transactions: Transaction[], 
    inventory: InventoryItem[], 
    itemType: ItemTypeFilter
): Record<string, number> => {
    const sales: Record<string, number> = {};
    transactions.forEach(t => {
      const month = new Date(t.date).toLocaleString('default', { month: 'short', year: 'numeric' });
      let monthTotal = 0;
      
      t.items?.forEach(item => {
        const inventoryItem = inventory.find(inv => inv.id === item.itemId);
        if (itemType === 'all' || (inventoryItem && inventoryItem.itemType === itemType)) {
          monthTotal += t.totalPrice;
        }
      });
      sales[month] = (sales[month] || 0) + monthTotal;
    });
    return sales;
};


export default function AnalysisPage() {
  const { transactions, inventory } = useAppContext();
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [patientType, setPatientType] = React.useState<PatientType>('all');
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('all');
  const [itemType, setItemType] = React.useState<ItemTypeFilter>('all');
  const [filteredTransactions, setFilteredTransactions] = React.useState<Transaction[]>([]);

  React.useEffect(() => {
    const dateFiltered = filterTransactionsByDate(transactions, date);
    const finalFiltered = dateFiltered.filter(t => {
      const isPatientTypeMatch = patientType === 'all' || t.patientType === patientType;
      const isPaymentMethodMatch = paymentMethod === 'all' || t.paymentMethod === paymentMethod;
      
      if (itemType !== 'all') {
        const hasMatchingItem = t.items?.some(item => {
          const inventoryItem = inventory.find(inv => inv.id === item.itemId);
          return inventoryItem?.itemType === itemType;
        });
        return isPatientTypeMatch && isPaymentMethodMatch && hasMatchingItem;
      }
      
      return isPatientTypeMatch && isPaymentMethodMatch;
    });
    setFilteredTransactions(finalFiltered);
  }, [date, patientType, paymentMethod, itemType, transactions, inventory]);
  
  const salesComparisonData = React.useMemo(() => {
    if (!date?.from || !date.to) return [];

    // Calculate previous period
    const duration = differenceInDays(date.to, date.from);
    const prevDate = {
      from: subDays(date.from, duration + 1),
      to: subDays(date.to, duration + 1),
    };

    const currentPeriodTransactions = filterTransactionsByDate(filteredTransactions, date);
    const previousPeriodTransactions = filterTransactionsByDate(transactions, prevDate)
      .filter(t => {
        const isPatientTypeMatch = patientType === 'all' || t.patientType === patientType;
        const isPaymentMethodMatch = paymentMethod === 'all' || t.paymentMethod === paymentMethod;
        return isPatientTypeMatch && isPaymentMethodMatch;
      });

    const currentSales = calculateMonthlySales(currentPeriodTransactions, inventory, itemType);
    const previousSales = calculateMonthlySales(previousPeriodTransactions, inventory, itemType);
    
    const allMonths = new Set([...Object.keys(currentSales), ...Object.keys(previousSales)]);
    
    const sortedMonths = Array.from(allMonths).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return sortedMonths.map(month => ({
      name: month,
      current: currentSales[month] || 0,
      previous: previousSales[month] || 0,
    }));
  }, [date, filteredTransactions, transactions, inventory, itemType, patientType, paymentMethod]);


  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-headline font-bold tracking-tight">Analisis Pergerakan & Harga</h1>
        <p className="text-muted-foreground">
          Analisis pergerakan obat, tren penjualan, dan harga dari pemasok.
        </p>
      </div>
      
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <DateRangePicker date={date} onDateChange={setDate} />
            <Select value={patientType} onValueChange={(value) => setPatientType(value as PatientType)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Tipe Pasien" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe Pasien</SelectItem>
                <SelectItem value="Rawat Jalan">Rawat Jalan</SelectItem>
                <SelectItem value="Rawat Inap">Rawat Inap</SelectItem>
                <SelectItem value="Lain-lain">Lain-lain</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Metode Pembayaran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Metode Pembayaran</SelectItem>
                <SelectItem value="UMUM">UMUM</SelectItem>
                <SelectItem value="BPJS">BPJS</SelectItem>
                <SelectItem value="Lain-lain">Lain-lain</SelectItem>
              </SelectContent>
            </Select>
             <Select value={itemType} onValueChange={(value) => setItemType(value as ItemTypeFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Tipe Item" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe Item</SelectItem>
                <SelectItem value="Obat">Obat</SelectItem>
                <SelectItem value="Alkes">Alkes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        <AbcAnalysis transactions={filteredTransactions} itemTypeFilter={itemType} />
        <SalesTrendsChart data={salesComparisonData} />
        <SupplierPriceAnalysis inventory={inventory} />
      </div>
    </div>
  );
}
