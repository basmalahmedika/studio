
'use client';

import { TransactionsDataTable } from "@/components/transactions-data-table";

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold tracking-tight">Transactions</h1>
      <p className="text-muted-foreground">
        View and manage all medication transactions.
      </p>
      <TransactionsDataTable />
    </div>
  );
}
