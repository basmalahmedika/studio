'use client';

import * as React from 'react';
import * as XLSX from 'xlsx';
import { FileDown } from 'lucide-react';
import type { Transaction, InventoryItem } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface TransactionDetailsDialogProps {
  transactions: Transaction[];
  inventory: InventoryItem[];
  title: string;
  children: React.ReactNode;
}

export function TransactionDetailsDialog({ transactions, inventory, title, children }: TransactionDetailsDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const calculateTotal = (transaction: Transaction): number => {
    return (transaction.items || []).reduce((sum, item) => {
        const inventoryItem = inventory.find(inv => inv.id === item.itemId);
        const purchasePrice = inventoryItem?.purchasePrice || 0;
        const priceToUse = (transaction.paymentMethod === 'BPJS' || transaction.paymentMethod === 'Lain-lain') ? purchasePrice : item.price;
        return sum + (priceToUse * item.quantity);
    }, 0);
  };

  const handleExport = () => {
    const dataToExport = transactions.map(t => ({
      'No. Rekam Medis': t.medicalRecordNumber,
      'Tanggal': t.date,
      'Total Transaksi': calculateTotal(t),
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Detail Transaksi');
    XLSX.writeFile(wb, `detail_transaksi_${title.replace(/ /g, '_')}.xlsx`);
  };

  const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Menampilkan {transactions.length} transaksi yang sesuai dengan filter yang dipilih.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleExport}>
                <FileDown className="mr-2 h-4 w-4" />
                Ekspor Excel
            </Button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Rekam Medis</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Total Transaksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length > 0 ? (
                transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.medicalRecordNumber}</TableCell>
                    <TableCell>{t.date}</TableCell>
                    <TableCell className="text-right">{formatCurrency(calculateTotal(t))}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    Tidak ada transaksi untuk ditampilkan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
