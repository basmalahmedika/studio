
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';

interface SalesComparisonData {
  name: string;
  current: number;
  previous: number;
}

interface SalesTrendsChartProps {
  data: SalesComparisonData[];
}

const chartConfig = {
  current: {
    label: 'Periode Ini',
    color: 'hsl(var(--primary))',
  },
  previous: {
    label: 'Periode Sebelumnya',
    color: 'hsl(var(--secondary))',
  },
};

export function SalesTrendsChart({ data }: SalesTrendsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tren Penjualan</CardTitle>
        <CardDescription>Perbandingan kinerja penjualan dengan periode sebelumnya.</CardDescription>
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
                    const label = name === 'current' ? 'Periode Ini' : 'Periode Sebelumnya';
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
       <CardFooter>
        <p className="text-sm text-muted-foreground">
          *Grafik ini membandingkan total nilai penjualan (omzet) dari rentang tanggal yang Anda pilih dengan periode waktu yang sama sebelumnya.
        </p>
      </CardFooter>
    </Card>
  );
}
