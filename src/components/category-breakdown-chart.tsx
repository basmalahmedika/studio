
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface BreakdownData {
  name: string; 
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
    label: 'UMUM',
    color: 'hsl(var(--chart-1))',
  },
  bpjs: {
    label: 'BPJS',
    color: 'hsl(var(--chart-2))',
  },
};

export function CategoryBreakdownChart({ title, description, data }: CategoryBreakdownChartProps) {
  const customData = data.map(item => ({
    ...item,
    name: item.name === 'Periode Ini' ? 'Bulan Ini' : 'Bulan Lalu'
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={customData} accessibilityLayer>
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
