
'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { startOfMonth } from 'date-fns';
import { AbcAnalysis } from '@/components/abc-analysis';
import { SalesTrendsChart } from '@/components/sales-trends-chart';
import { useAppContext } from '@/context/app-context';
import type { Transaction } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { DateRangePicker } from '@/components/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type PatientType = 'all' | 'Rawat Jalan' | 'Rawat Inap';
type PaymentMethod = 'all' | 'UMUM' | 'BPJS';

export default function AnalysisPage() {
  const { transactions } = useAppContext();
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [patientType, setPatientType] = React.useState<PatientType>('all');
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('all');
  const [filteredTransactions, setFilteredTransactions] = React.useState<Transaction[]>([]);

  React.useEffect(() => {
    const filtered = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      // Set time to 0 to compare dates only
      transactionDate.setHours(0, 0, 0, 0);

      const fromDate = date?.from;
      if (fromDate) fromDate.setHours(0, 0, 0, 0);
      
      const toDate = date?.to;
      if (toDate) toDate.setHours(0, 0, 0, 0);

      const isDateInRange = fromDate && toDate 
        ? transactionDate >= fromDate && transactionDate <= toDate 
        : true;
      
      const isPatientTypeMatch = patientType === 'all' || t.patientType === patientType;
      const isPaymentMethodMatch = paymentMethod === 'all' || t.paymentMethod === paymentMethod;
      return isDateInRange && isPatientTypeMatch && isPaymentMethodMatch;
    });
    setFilteredTransactions(filtered);
  }, [date, patientType, paymentMethod, transactions]);

  const salesByMonth = React.useMemo(() => {
    const sales: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      const month = new Date(t.date).toLocaleString('default', { month: 'short', year: 'numeric' });
      sales[month] = (sales[month] || 0) + t.totalPrice;
    });

    const sortedMonths = Object.keys(sales).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return sortedMonths.map(month => ({ name: month, total: sales[month] }));
  }, [filteredTransactions]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-headline font-bold tracking-tight">Movement Analysis</h1>
        <p className="text-muted-foreground">
          ABC analysis to categorize medication movement and view sales trends.
        </p>
      </div>
      
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DateRangePicker date={date} onDateChange={setDate} />
            <Select value={patientType} onValueChange={(value) => setPatientType(value as PatientType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Patient Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Patient Types</SelectItem>
                <SelectItem value="Rawat Jalan">Rawat Jalan</SelectItem>
                <SelectItem value="Rawat Inap">Rawat Inap</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Methods</SelectItem>
                <SelectItem value="UMUM">UMUM</SelectItem>
                <SelectItem value="BPJS">BPJS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        <AbcAnalysis transactions={filteredTransactions} />
        <SalesTrendsChart data={salesByMonth} />
      </div>
    </div>
  );
}
