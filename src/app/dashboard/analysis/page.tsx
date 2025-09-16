
'use client';

import * as React from 'react';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfMonth } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { AbcAnalysis } from '@/components/abc-analysis';
import { SalesTrendsChart } from '@/components/sales-trends-chart';
import { transactions as allTransactions } from '@/lib/data';
import type { Transaction } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';

type PatientType = 'all' | 'Rawat Jalan' | 'Rawat Inap';
type PaymentMethod = 'all' | 'UMUM' | 'BPJS';

export default function AnalysisPage() {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [patientType, setPatientType] = React.useState<PatientType>('all');
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('all');
  const [filteredTransactions, setFilteredTransactions] = React.useState<Transaction[]>([]);

  React.useEffect(() => {
    const filtered = allTransactions.filter(t => {
      const transactionDate = new Date(t.date);
      const isDateInRange = date?.from && date?.to 
        ? transactionDate >= date.from && transactionDate <= date.to 
        : true;
      const isPatientTypeMatch = patientType === 'all' || t.patientType === patientType;
      const isPaymentMethodMatch = paymentMethod === 'all' || t.paymentMethod === paymentMethod;
      return isDateInRange && isPatientTypeMatch && isPaymentMethodMatch;
    });
    setFilteredTransactions(filtered);
  }, [date, patientType, paymentMethod]);

  const salesByMonth = React.useMemo(() => {
    const sales = filteredTransactions.reduce((acc, t) => {
      const month = format(new Date(t.date), 'MMM yyyy');
      acc[month] = (acc[month] || 0) + t.totalPrice;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(sales)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "LLL dd, y")} -{" "}
                          {format(date.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(date.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
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
