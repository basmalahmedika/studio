
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface CategoryData {
  name: string;
  revenue: number;
  expenditure: number;
}

interface CategoryAnalysisChartProps {
  data: CategoryData[];
}

const chartConfig = {
  revenue: {
    label: 'Pendapatan',
    color: 'hsl(var(--chart-1))',
  },
  expenditure: {
    label: 'Pengeluaran',
    color: 'hsl(var(--chart-2))',
  },
};

export function CategoryAnalysisChart({ data }: CategoryAnalysisChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analisis Kategori</CardTitle>
        <CardDescription>Perbandingan pendapatan dan pengeluaran berdasarkan kategori pasien.</CardDescription>
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
