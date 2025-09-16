
import type { Transaction } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const recentTransactions = transactions.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>A list of the most recent sales from the selected period.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medication</TableHead>
              <TableHead className="hidden sm:table-cell">Patient Type</TableHead>
              <TableHead className="hidden sm:table-cell">Payment</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="font-medium max-w-xs truncate">{transaction.medicationName}</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      {transaction.date}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {transaction.patientType}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge className="text-xs" variant={transaction.paymentMethod === 'BPJS' ? 'secondary' : 'outline'}>
                      {transaction.paymentMethod}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    Rp {transaction.totalPrice.toLocaleString('id-ID')}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No transactions found for the selected period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
