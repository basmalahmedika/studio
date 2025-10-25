
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

      const fromDate = date?.from ? new Date(date.from) : null;
      if (fromDate) fromDate.setHours(0, 0, 0, 0);
      
      const toDate = date?.to ? new Date(date.to) : null;
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
      lainUmum: 0,
      lainBpjs: 0,
      lainLain: 0,
      revenueRjUmum: 0,
      revenueRjBpjs: 0,
      revenueRiUmum: 0,
      revenueRiBpjs: 0,
      revenueLainUmum: 0,
      revenueLainBpjs: 0,
      revenueLainLain: 0,
    };

    filteredTransactions.forEach(t => {
      data.totalTransactions += 1;
      
      if (t.patientType === 'Rawat Jalan' && t.paymentMethod === 'UMUM') {
        data.rjUmum += 1;
        data.revenueRjUmum += t.totalPrice;
      }
      if (t.patientType === 'Rawat Jalan' && t.paymentMethod === 'BPJS') {
        data.rjBpjs += 1;
        data.revenueRjBpjs += t.totalPrice;
      }
      if (t.patientType === 'Rawat Inap' && t.paymentMethod === 'UMUM') {
        data.riUmum += 1;
        data.revenueRiUmum += t.totalPrice;
      }
      if (t.patientType === 'Rawat Inap' && t.paymentMethod === 'BPJS') {
        data.riBpjs += 1;
        data.revenueRiBpjs += t.totalPrice;
      }
      if (t.patientType === 'Lain-lain' && t.paymentMethod === 'UMUM') {
        data.lainUmum += 1;
        data.revenueLainUmum += t.totalPrice;
      }
      if (t.patientType === 'Lain-lain' && t.paymentMethod === 'BPJS') {
        data.lainBpjs += 1;
        data.revenueLainBpjs += t.totalPrice;
      }
       if (t.patientType === 'Lain-lain' && t.paymentMethod === 'Lain-lain') {
        data.lainLain += 1;
        data.revenueLainLain += t.totalPrice;
      }
    });

    data.totalRevenue = data.revenueRjUmum + data.revenueRiUmum;

    return data;
  }, [filteredTransactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight">Dasbor</h1>
        <div className="w-full md:w-auto">
           <DateRangePicker date={date} onDateChange={setDate} align="end" />
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Pendapatan"
          value={`Rp ${stats.totalRevenue.toLocaleString('id-ID')}`}
          icon={DollarSign}
          description="Pendapatan dari RJ Umum & RI Umum"
          color="bg-green-600"
        />
        <StatCard
          title="Total Transaksi"
          value={stats.totalTransactions.toString()}
          icon={ReceiptText}
          description="Jumlah total penjualan"
           color="bg-blue-600"
        />
        <StatCard
          title="Rawat Jalan (UMUM / BPJS)"
          value={`${stats.rjUmum} / ${stats.rjBpjs}`}
          icon={Users}
          description="Jumlah layanan rawat jalan"
           color="bg-yellow-500"
        />
        <StatCard
          title="Rawat Inap (UMUM / BPJS)"
          value={`${stats.riUmum} / ${stats.riBpjs}`}
          icon={Users}
          description="Jumlah layanan rawat inap"
           color="bg-sky-500"
        />
        <StatCard
          title="Pendapatan RJ Umum"
          value={`Rp ${stats.revenueRjUmum.toLocaleString('id-ID')}`}
          icon={DollarSign}
          description="Total pendapatan dari Rawat Jalan Umum"
           color="bg-emerald-500"
        />
         <StatCard
          title="Pengeluaran RJ BPJS"
          value={`Rp ${stats.revenueRjBpjs.toLocaleString('id-ID')}`}
          icon={DollarSign}
          description="Total pengeluaran dari Rawat Jalan BPJS"
           color="bg-red-500"
        />
         <StatCard
          title="Pendapatan RI Umum"
          value={`Rp ${stats.revenueRiUmum.toLocaleString('id-ID')}`}
          icon={DollarSign}
          description="Total pendapatan dari Rawat Inap Umum"
           color="bg-teal-500"
        />
         <StatCard
          title="Pengeluaran RI BPJS"
          value={`Rp ${stats.revenueRiBpjs.toLocaleString('id-ID')}`}
          icon={DollarSign}
          description="Total pengeluaran dari Rawat Inap BPJS"
           color="bg-orange-500"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopSellingItems 
          title="Obat Terlaris"
          transactions={filteredTransactions}
          inventory={inventory}
          itemType="Obat"
          icon={Pill}
        />
        <TopSellingItems 
          title="Alat Kesehatan Terlaris"
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
