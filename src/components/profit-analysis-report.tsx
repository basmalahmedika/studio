
'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { startOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DollarSign, FileDown, Printer } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/date-range-picker';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useAppContext } from '@/context/app-context';
import type { Transaction } from '@/lib/types';
import { StatCard } from './stat-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type PatientType = 'all' | 'Rawat Jalan' | 'Rawat Inap' | 'Lain-lain';
type PaymentMethod = 'all' | 'UMUM' | 'BPJS' | 'Lain-lain';

const chartConfig = {
  revenue: { label: 'Revenue', color: 'hsl(var(--chart-2))' },
  cost: { label: 'Cost', color: 'hsl(var(--chart-5))' },
  profit: { label: 'Profit', color: 'hsl(var(--primary))' },
};

export function ProfitAnalysisReport() {
  const { transactions, inventory } = useAppContext();
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [patientType, setPatientType] = React.useState<PatientType>('all');
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('all');
  const [filteredTransactions, setFilteredTransactions] = React.useState<Transaction[]>([]);
  const reportRef = React.useRef<HTMLDivElement>(null);


  React.useEffect(() => {
    const filtered = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      transactionDate.setHours(0, 0, 0, 0);

      const fromDate = date?.from ? new Date(date.from) : null;
      if (fromDate) fromDate.setHours(0, 0, 0, 0);
      
      const toDate = date?.to ? new Date(date.to) : null;
      if (toDate) toDate.setHours(0, 0, 0, 0);

      const isDateInRange = fromDate && toDate 
        ? transactionDate >= fromDate && transactionDate <= toDate 
        : true;
        
      const isPatientTypeMatch = patientType === 'all' || t.patientType === patientType;
      const isPaymentMethodMatch = paymentMethod === 'all' || t.paymentMethod === paymentMethod;

      return isDateInRange && isPatientTypeMatch && isPaymentMethodMatch;
    });
    setFilteredTransactions(filtered);
  }, [date, transactions, patientType, paymentMethod]);
  
  const analysisData = React.useMemo(() => {
    const data = {
      obat: { revenue: 0, cost: 0, profit: 0 },
      alkes: { revenue: 0, cost: 0, profit: 0 },
    };

    if (inventory.length === 0) return data;

    filteredTransactions.forEach(t => {
      if (!t.items) return;
      t.items.forEach(item => {
        const inventoryItem = inventory.find(inv => inv.id === item.itemId);
        if (inventoryItem) {
          const itemRevenue = item.price * item.quantity;
          const itemCost = inventoryItem.purchasePrice * item.quantity;
          const itemProfit = itemRevenue - itemCost;
          
          if (inventoryItem.itemType === 'Obat') {
            data.obat.revenue += itemRevenue;
            data.obat.cost += itemCost;
            data.obat.profit += itemProfit;
          } else if (inventoryItem.itemType === 'Alkes') {
            data.alkes.revenue += itemRevenue;
            data.alkes.cost += itemCost;
            data.alkes.profit += itemProfit;
          }
        }
      });
    });
    
    return data;
  }, [filteredTransactions, inventory]);

  const chartData = [
    { name: 'Obat', ...analysisData.obat },
    { name: 'Alkes', ...analysisData.alkes },
  ];

  const handleExportData = () => {
    const dataToExport = [
      { Category: 'Obat', ...analysisData.obat },
      { Category: 'Alkes', ...analysisData.alkes },
      { 
        Category: 'Total',
        revenue: analysisData.obat.revenue + analysisData.alkes.revenue,
        cost: analysisData.obat.cost + analysisData.alkes.cost,
        profit: analysisData.obat.profit + analysisData.alkes.profit,
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Profit Analysis');
    
    ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.writeFile(wb, 'profit_analysis_report.xlsx');
  };

  const handlePrint = () => {
    const printContents = reportRef.current?.innerHTML;
    const originalContents = document.body.innerHTML;
    
    if (printContents) {
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Print Report</title>');
        // Simple styling for print
        printWindow.document.write(`
          <style>
            body { font-family: Arial, sans-serif; }
            .card { border: 1px solid #ccc; border-radius: 8px; margin-bottom: 20px; }
            .card-header { padding: 16px; border-bottom: 1px solid #ccc; }
            .card-title { font-size: 1.5rem; font-weight: bold; }
            .card-description { color: #555; }
            .card-content { padding: 16px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
            .stat-card { border: 1px solid #eee; padding: 12px; border-radius: 6px; }
            h4 { font-size: 1.2rem; font-weight: bold; }
            dl { display: grid; grid-template-columns: 1fr 2fr; gap: 4px; }
            dt { color: #777; }
            dd { font-weight: bold; }
            /* Hide chart for printing as it might not render well */
            .chart-container { display: none; }
          </style>
        `);
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContents);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { // Timeout needed for some browsers to load content
          printWindow.print();
          printWindow.close();
        }, 500);
      }
    }
  };

  const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              Profit & Cost Analysis
            </CardTitle>
            <CardDescription>
              Analyze revenue, cost, and profit from sales based on the selected filters.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 print-hide">
             <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print PDF
            </Button>
             <Button variant="outline" size="sm" onClick={handleExportData}>
                <FileDown className="mr-2 h-4 w-4" />
                Export Excel
            </Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 print-hide">
            <DateRangePicker date={date} onDateChange={setDate} />
            <Select value={patientType} onValueChange={(value) => setPatientType(value as PatientType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Patient Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Patient Types</SelectItem>
                <SelectItem value="Rawat Jalan">Rawat Jalan</SelectItem>
                <SelectItem value="Rawat Inap">Rawat Inap</SelectItem>
                <SelectItem value="Lain-lain">Lain-lain</SelectItem>
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
                 <SelectItem value="Lain-lain">Lain-lain</SelectItem>
              </SelectContent>
            </Select>
          </div>
      </CardHeader>
      <CardContent ref={reportRef} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
           <StatCard title="Total Revenue" value={formatCurrency(analysisData.obat.revenue + analysisData.alkes.revenue)} icon={DollarSign} description="Total income from sales" />
           <StatCard title="Total Cost" value={formatCurrency(analysisData.obat.cost + analysisData.alkes.cost)} icon={DollarSign} description="Total purchase cost of goods sold" />
           <StatCard title="Total Profit" value={formatCurrency(analysisData.obat.profit + analysisData.alkes.profit)} icon={DollarSign} description="Total net profit" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
            <Card className="chart-container print-hide">
                <CardHeader>
                    <CardTitle>Analysis Chart</CardTitle>
                    <CardDescription>Revenue, Cost, and Profit Visualization</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <BarChart data={chartData} accessibilityLayer>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                        <YAxis tickFormatter={(value) => `Rp ${Number(value) / 1000}k`} />
                        <Tooltip
                            cursor={false}
                            content={<ChartTooltipContent 
                                formatter={(value) => formatCurrency(Number(value))} 
                                indicator="dot" 
                            />}
                        />
                         <Legend />
                        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                        <Bar dataKey="cost" fill="var(--color-cost)" radius={4} />
                        <Bar dataKey="profit" fill="var(--color-profit)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Detailed Breakdown</CardTitle>
                     <CardDescription>Numeric breakdown by item type</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-lg">Obat (Medication)</h4>
                            <dl className="grid grid-cols-3 gap-2 text-sm mt-2">
                                <dt className="text-muted-foreground">Revenue</dt>
                                <dd className="col-span-2">{formatCurrency(analysisData.obat.revenue)}</dd>
                                <dt className="text-muted-foreground">Cost</dt>
                                <dd className="col-span-2">{formatCurrency(analysisData.obat.cost)}</dd>
                                <dt className="text-muted-foreground">Profit</dt>
                                <dd className="col-span-2 font-bold text-primary">{formatCurrency(analysisData.obat.profit)}</dd>
                            </dl>
                        </div>
                         <div>
                            <h4 className="font-semibold text-lg">Alkes (Medical Devices)</h4>
                             <dl className="grid grid-cols-3 gap-2 text-sm mt-2">
                                <dt className="text-muted-foreground">Revenue</dt>
                                <dd className="col-span-2">{formatCurrency(analysisData.alkes.revenue)}</dd>
                                <dt className="text-muted-foreground">Cost</dt>
                                <dd className="col-span-2">{formatCurrency(analysisData.alkes.cost)}</dd>
                                <dt className="text-muted-foreground">Profit</dt>
                                <dd className="col-span-2 font-bold text-primary">{formatCurrency(analysisData.alkes.profit)}</dd>
                            </dl>
                        </div>
                   </div>
                </CardContent>
            </Card>
        </div>
      </CardContent>
    </Card>
  );
}

    
