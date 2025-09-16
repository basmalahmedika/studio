import { DollarSign, ReceiptText, Pill, Users } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { RecentTransactions } from '@/components/recent-transactions';
import { transactions } from '@/lib/data';

export default function DashboardPage() {
  const totalRevenue = transactions.reduce((acc, t) => acc + t.totalPrice, 0);
  const totalTransactions = transactions.length;
  const uniqueMedicationsSold = new Set(transactions.map(t => t.medicationName)).size;
  const patientTypes = transactions.reduce((acc, t) => {
    acc[t.patientType] = (acc[t.patientType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold tracking-tight">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`Rp ${totalRevenue.toLocaleString('id-ID')}`}
          icon={DollarSign}
          description="Total revenue from all transactions"
        />
        <StatCard
          title="Total Transactions"
          value={totalTransactions.toString()}
          icon={ReceiptText}
          description="Total number of sales"
        />
        <StatCard
          title="Unique Medications"
          value={uniqueMedicationsSold.toString()}
          icon={Pill}
          description="Number of unique products sold"
        />
        <StatCard
          title="Outpatients vs Inpatients"
          value={`${patientTypes['Rawat Jalan'] || 0} / ${patientTypes['Rawat Inap'] || 0}`}
          icon={Users}
          description="Number of outpatient vs inpatient services"
        />
      </div>
      <div>
        <RecentTransactions />
      </div>
    </div>
  );
}
