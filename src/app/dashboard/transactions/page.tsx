
'use client';

import { TransactionsDataTable } from "@/components/transactions-data-table";

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-headline font-bold tracking-tight">Transaksi</h1>
        <p className="text-muted-foreground">
          Lihat dan kelola semua transaksi obat-obatan berdasarkan filter global.
        </p>
      </div>
      <TransactionsDataTable />
    </div>
  );
}

    