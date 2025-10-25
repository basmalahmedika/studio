
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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
  totalCurrent: number;
  totalPrevious: number;
}

export function MonthlyTrendChart({ title, description, data, dataKey, chartColor, totalCurrent, totalPrevious }: MonthlyTrendChartProps) {
  const chartConfig = {
    [dataKey]: {
      label: title.split(' ')[1], // e.g., "Pendapatan" or "Pengeluaran"
      color: chartColor,
    },
  };
  
  const percentageChange = totalPrevious > 0 ? ((totalCurrent - totalPrevious) / totalPrevious) * 100 : totalCurrent > 0 ? 100 : 0;
  const isIncrease = percentageChange > 0;
  const isDecrease = percentageChange < 0;

  const AnalysisFooter = () => {
    if (totalCurrent === 0 && totalPrevious === 0) {
      return (
         <p className="text-sm text-muted-foreground">
           Tidak ada data untuk dianalisis pada periode ini dan sebelumnya.
         </p>
      )
    }

    let text;
    let Icon;
    let colorClass;

    if (isIncrease) {
        text = `Ada kenaikan sebesar ${percentageChange.toFixed(1)}% dibandingkan periode sebelumnya.`;
        Icon = TrendingUp;
        colorClass = "text-green-600";
    } else if (isDecrease) {
        text = `Ada penurunan sebesar ${Math.abs(percentageChange).toFixed(1)}% dibandingkan periode sebelumnya.`;
        Icon = TrendingDown;
        colorClass = "text-red-600";
    } else {
        text = "Tidak ada perubahan signifikan dibandingkan periode sebelumnya.";
        Icon = Minus;
        colorClass = "text-muted-foreground";
    }

    return (
        <div className={`flex items-center text-sm ${colorClass}`}>
            <Icon className="mr-2 h-4 w-4" />
            <p>{text}</p>
        </div>
    );
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
            <ChartTooltipContent
              formatter={(value) => `Rp ${Number(value).toLocaleString('id-ID')}`}
              cursor={false}
              indicator="dot"
            />
            <Bar dataKey={dataKey} fill={`var(--color-${dataKey})`} radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
       <CardFooter>
          <AnalysisFooter />
      </CardFooter>
    </Card>
  );
}
