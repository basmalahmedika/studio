
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface MonthlyData {
  name: string;
  revenue: number;
  expenditure: number;
}

interface MonthlyRevenueChartProps {
  data: MonthlyData[];
}

const chartConfig = {
  revenue: {
    label: 'Pendapatan (UMUM)',
    color: 'hsl(var(--chart-1))',
  },
  expenditure: {
    label: 'Pengeluaran (BPJS & Lainnya)',
    color: 'hsl(var(--chart-2))',
  },
};

export function MonthlyRevenueChart({ data }: MonthlyRevenueChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Grafik Pendapatan vs Pengeluaran</CardTitle>
        <CardDescription>Perbandingan pendapatan dan pengeluaran per bulan.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis
              tickFormatter={(value) => `Rp ${Number(value) / 1000}k`}
            />
            <Tooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value) => `Rp ${Number(value).toLocaleString('id-ID')}`}
                  indicator="dot"
                />
              }
            />
            <Legend />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
            <Bar dataKey="expenditure" fill="var(--color-expenditure)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
