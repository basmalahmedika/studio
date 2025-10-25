
'use client';

import { ExpiringStockReport } from '@/components/expiring-stock-report';
import { LowStockReport } from '@/components/low-stock-report';
import { ProfitAnalysisReport } from '@/components/profit-analysis-report';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
       <div className="space-y-2">
        <h1 className="text-3xl font-headline font-bold tracking-tight">Laporan</h1>
        <p className="text-muted-foreground">
          Buat dan lihat laporan terperinci untuk operasional apotek Anda.
        </p>
      </div>

      <div className="space-y-6">
        <ProfitAnalysisReport />
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
