
'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { startOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DollarSign, FileDown } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/date-range-picker';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useAppContext } from '@/context/app-context';
import type { Transaction } from '@/lib/types';
import { StatCard } from './stat-card';

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
              Analyze revenue, cost, and profit from sales based on the selected date range.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
             <DateRangePicker date={date} onDateChange={setDate} align="end" />
             <Button variant="outline" size="sm" onClick={handleExportData}>
                <FileDown className="mr-2 h-4 w-4" />
                Export Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
           <StatCard title="Total Revenue" value={formatCurrency(analysisData.obat.revenue + analysisData.alkes.revenue)} icon={DollarSign} description="Total income from sales" />
           <StatCard title="Total Cost" value={formatCurrency(analysisData.obat.cost + analysisData.alkes.cost)} icon={DollarSign} description="Total purchase cost of goods sold" />
           <StatCard title="Total Profit" value={formatCurrency(analysisData.obat.profit + analysisData.alkes.profit)} icon={DollarSign} description="Total net profit" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
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
