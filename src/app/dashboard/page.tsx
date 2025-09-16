
'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { startOfMonth } from 'date-fns';
import { DollarSign, ReceiptText, Users, Pill, Stethoscope } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { RecentTransactions } from '@/components/recent-transactions';
import { TopSellingItems } from '@/components/top-selling-items';
import { DateRangePicker } from '@/components/date-range-picker';
import { useAppContext } from '@/context/app-context';
import type { Transaction } from '@/lib/types';

export default function DashboardPage() {
  const { transactions, inventory } = useAppContext();

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const [filteredTransactions, setFilteredTransactions] = React.useState<Transaction[]>([]);

  React.useEffect(() => {
    const filtered = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      transactionDate.setHours(0, 0, 0, 0);

      const fromDate = date?.from;
      if (fromDate) fromDate.setHours(0, 0, 0, 0);
      
      const toDate = date?.to;
      if (toDate) toDate.setHours(0, 0, 0, 0);

      return fromDate && toDate 
        ? transactionDate >= fromDate && transactionDate <= toDate 
        : true;
    });
    setFilteredTransactions(filtered);
  }, [date, transactions]);

  const stats = React.useMemo(() => {
    const data = {
      totalRevenue: 0,
      totalTransactions: 0,
      rjUmum: 0,
      rjBpjs: 0,
      riUmum: 0,
      riBpjs: 0,
    };

    filteredTransactions.forEach(t => {
      data.totalRevenue += t.totalPrice;
      data.totalTransactions += 1;
      if (t.patientType === 'Rawat Jalan' && t.paymentMethod === 'UMUM') data.rjUmum += 1;
      if (t.patientType === 'Rawat Jalan' && t.paymentMethod === 'BPJS') data.rjBpjs += 1;
      if (t.patientType === 'Rawat Inap' && t.paymentMethod === 'UMUM') data.riUmum += 1;
      if (t.patientType === 'Rawat Inap' && t.paymentMethod === 'BPJS') data.riBpjs += 1;
    });

    return data;
  }, [filteredTransactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight">Dashboard</h1>
        <div className="w-full md:w-auto">
           <DateRangePicker date={date} onDateChange={setDate} align="end" />
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`Rp ${stats.totalRevenue.toLocaleString('id-ID')}`}
          icon={DollarSign}
          description="Total revenue from all transactions"
        />
        <StatCard
          title="Total Transactions"
          value={stats.totalTransactions.toString()}
          icon={ReceiptText}
          description="Total number of sales"
        />
        <StatCard
          title="Outpatient (UMUM / BPJS)"
          value={`${stats.rjUmum} / ${stats.rjBpjs}`}
          icon={Users}
          description="Number of outpatient services"
        />
        <StatCard
          title="Inpatient (UMUM / BPJS)"
          value={`${stats.riUmum} / ${stats.riBpjs}`}
          icon={Users}
          description="Number of inpatient services"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopSellingItems 
          title="Top Selling Medications"
          transactions={filteredTransactions}
          inventory={inventory}
          itemType="Obat"
          icon={Pill}
        />
        <TopSellingItems 
          title="Top Selling Medical Devices"
          transactions={filteredTransactions}
          inventory={inventory}
          itemType="Alkes"
          icon={Stethoscope}
        />
      </div>
      
      <div>
        <RecentTransactions transactions={filteredTransactions} />
      </div>
    </div>
  );
}
