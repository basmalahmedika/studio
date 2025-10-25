
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface MonthlyData {
  name: string;
  total: number;
}

interface MonthlyTrendChartProps {
  title: string;
  description: string;
  data: MonthlyData[];
  dataKey: string;
  chartColor: string;
}

export function MonthlyTrendChart({ title, description, data, dataKey, chartColor }: MonthlyTrendChartProps) {
  const chartConfig = {
    [dataKey]: {
      label: title.split(' ')[1], // e.g., "Pendapatan" or "Pengeluaran"
      color: chartColor,
    },
  };

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
            <Bar dataKey={dataKey} fill={`var(--color-${dataKey})`} radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
