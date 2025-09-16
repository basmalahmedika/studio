'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { SalesData } from '@/lib/types';

interface SalesTrendsChartProps {
  data: SalesData[];
}

const chartConfig = {
  total: {
    label: 'Sales',
    color: 'hsl(var(--primary))',
  },
};

export function SalesTrendsChart({ data }: SalesTrendsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Trends</CardTitle>
        <CardDescription>Monthly sales performance</CardDescription>
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
                content={<ChartTooltipContent 
                  formatter={(value) => `Rp ${Number(value).toLocaleString('id-ID')}`} 
                  indicator="dot" 
                 />}
              />
              <Bar dataKey="total" fill="var(--color-total)" radius={4} />
            </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
