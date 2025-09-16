import { ExpiringStockReport } from '@/components/expiring-stock-report';
import { LowStockReport } from '@/components/low-stock-report';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
       <div className="space-y-2">
        <h1 className="text-3xl font-headline font-bold tracking-tight">Stock Reports</h1>
        <p className="text-muted-foreground">
          Monitor low stock levels and items nearing their expiration date.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-1">
          <LowStockReport />
        </div>
        <div className="lg:col-span-1">
          <ExpiringStockReport />
        </div>
      </div>
    </div>
  );
}
