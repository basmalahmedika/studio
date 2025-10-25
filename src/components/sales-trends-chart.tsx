
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { ReactNode } from 'react';

interface SalesComparisonData {
  name: string;
  current: number;
  previous: number;
}

interface SalesTrendsChartProps {
  title: string;
  data: SalesComparisonData[];
  footer?: ReactNode;
  currentLabel?: string;
  previousLabel?: string;
}


export function SalesTrendsChart({ title, data, footer, currentLabel = 'Periode Ini', previousLabel = 'Periode Lalu' }: SalesTrendsChartProps) {
  
  const chartConfig = {
    current: {
      label: currentLabel,
      color: 'hsl(var(--chart-1))',
    },
    previous: {
      label: previousLabel,
      color: 'hsl(var(--chart-2))',
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Perbandingan kinerja dengan periode waktu yang sama sebelumnya.</CardDescription>
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
                  formatter={(value, name) => {
                    const dataKey = name as keyof typeof chartConfig;
                    const label = chartConfig[dataKey]?.label || name;
                    return (
                        <div className="flex flex-col">
                            <span>{label}</span>
                            <span className="font-bold">Rp {Number(value).toLocaleString('id-ID')}</span>
                        </div>
                    )
                  }}
                  indicator="dot" 
                 />}
              />
              <Legend />
              <Bar dataKey="previous" fill="var(--color-previous)" radius={4} />
              <Bar dataKey="current" fill="var(--color-current)" radius={4} />
            </BarChart>
        </ChartContainer>
      </CardContent>
       {footer ? footer : (
         <CardFooter>
            <p className="text-sm text-muted-foreground">
            *Grafik membandingkan total dari rentang tanggal yang dipilih dengan periode sebelumnya.
            </p>
        </CardFooter>
       )}
    </Card>
  );
}
