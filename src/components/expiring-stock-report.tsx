
'use client';

import * as React from 'react';
import { differenceInMonths, parseISO, formatDistanceToNowStrict, isPast } from 'date-fns';
import { id } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/context/app-context';
import type { InventoryItem } from '@/lib/types';
import { Clock, FileDown } from 'lucide-react';

type ExpiryZone = 'Aman' | 'Waspada' | 'Kritis' | 'Expired';

interface ExpiringItem extends InventoryItem {
  zone: ExpiryZone;
  monthsLeft: number;
  timeLeft: string;
}

const getExpiryZone = (expiredDate: string): { zone: ExpiryZone, monthsLeft: number, timeLeft: string } => {
  const now = new Date();
  const expiry = parseISO(expiredDate);
  
  if (isPast(expiry)) {
    return { zone: 'Expired', monthsLeft: -1, timeLeft: 'Sudah kadaluarsa' };
  }

  const monthsLeft = differenceInMonths(expiry, now);
  const timeLeft = formatDistanceToNowStrict(expiry, { addSuffix: true, locale: id });

  if (monthsLeft < 6) {
    return { zone: 'Kritis', monthsLeft, timeLeft };
  } else if (monthsLeft >= 6 && monthsLeft <= 12) {
    return { zone: 'Waspada', monthsLeft, timeLeft };
  } else {
    return { zone: 'Aman', monthsLeft, timeLeft };
  }
};

export function ExpiringStockReport() {
  const { inventory } = useAppContext();
  const [expiringItems, setExpiringItems] = React.useState<ExpiringItem[]>([]);

  React.useEffect(() => {
    const classifiedItems = inventory.map(item => {
      const { zone, monthsLeft, timeLeft } = getExpiryZone(item.expiredDate);
      return { ...item, zone, monthsLeft, timeLeft };
    })
    .sort((a, b) => a.monthsLeft - b.monthsLeft);
    setExpiringItems(classifiedItems);
  }, [inventory]);

  const getBadgeClass = (zone: ExpiryZone) => {
    switch (zone) {
      case 'Expired':
        return 'bg-black text-white';
      case 'Kritis':
        return 'bg-destructive text-destructive-foreground';
      case 'Waspada':
        return 'bg-yellow-500 text-black';
      case 'Aman':
        return 'bg-green-600 text-white';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };
  
  const handleExportData = () => {
    const dataToExport = expiringItems.map((item, index) => ({
      'No.': index + 1,
      'Nama Item': item.itemName,
      'Sisa Stok': item.quantity,
      'Tanggal Kadaluarsa': item.expiredDate,
      'Sisa Waktu': item.timeLeft,
      'Status': item.zone,
    }));
    
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expiring Stock');
    
    ws['!cols'] = [
        { wch: 5 }, 
        { wch: 30 },
        { wch: 10 },
        { wch: 15 },
        { wch: 20 },
        { wch: 10 },
    ];

    XLSX.writeFile(wb, 'expiring_stock_report.xlsx');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Expiring Stock Report
            </CardTitle>
            <CardDescription>
              Stock classified by expiration date proximity.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportData}>
              <FileDown className="mr-2 h-4 w-4" />
              Export Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto max-h-96">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[50px]">No.</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead className="text-right">Sisa Stok</TableHead>
                <TableHead>Expired Date</TableHead>
                <TableHead>Sisa Waktu</TableHead>
                <TableHead className="text-right">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {expiringItems.map((item, index) => (
                <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.itemName}</TableCell>
                    <TableCell className="text-right font-bold">{item.quantity}</TableCell>
                    <TableCell>{item.expiredDate}</TableCell>
                    <TableCell>{item.timeLeft}</TableCell>
                    <TableCell className="text-right">
                    <Badge className={getBadgeClass(item.zone)}>{item.zone}</Badge>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
