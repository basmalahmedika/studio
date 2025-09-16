import { SalesTrendsChart } from '@/components/sales-trends-chart';
import { transactions } from '@/lib/data';
import { AbcAnalysis } from '@/components/abc-analysis';

export default function AnalysisPage() {
  // Aggregate sales data for the chart
  const salesByMonth = transactions.reduce((acc, t) => {
    const month = new Date(t.date).toLocaleString('default', { month: 'short', year: 'numeric' });
    acc[month] = (acc[month] || 0) + t.totalPrice;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(salesByMonth)
    .map(([name, total]) => ({ name, total }))
    .sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime());

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-headline font-bold tracking-tight">Movement Analysis</h1>
        <p className="text-muted-foreground">
          ABC analysis to categorize medication movement and view sales trends.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <AbcAnalysis />
        </div>
        <div className="lg:col-span-2">
           <SalesTrendsChart data={chartData} />
        </div>
      </div>
    </div>
  );
}
