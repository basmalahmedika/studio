
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface BreakdownData {
  name: string; // 'Periode Ini' | 'Periode Lalu'
  umum: number;
  bpjs: number;
}

interface CategoryBreakdownChartProps {
  title: string;
  description: string;
  data: BreakdownData[];
}

const chartConfig = {
  umum: {
    label: 'Pendapatan (UMUM)',
    color: 'hsl(var(--chart-1))',
  },
  bpjs: {
    label: 'Pengeluaran (BPJS)',
    color: 'hsl(var(--chart-2))',
  },
};

export function CategoryBreakdownChart({ title, description, data }: CategoryBreakdownChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
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
            <Bar dataKey="umum" fill="var(--color-umum)" radius={4} />
            <Bar dataKey="bpjs" fill="var(--color-bpjs)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
