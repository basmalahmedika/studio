'use client';

import * as React from 'react';
import { differenceInMonths, parseISO, formatDistanceToNowStrict } from 'date-fns';
import { id } from 'date-fns/locale';
import Papa from 'papaparse';
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
import { inventory } from '@/lib/data';
import type { InventoryItem } from '@/lib/types';
import { Clock, FileDown } from 'lucide-react';

type ExpiryZone = 'Aman' | 'Waspada' | 'Kritis';

interface ExpiringItem extends InventoryItem {
  zone: ExpiryZone;
  monthsLeft: number;
  timeLeft: string;
}

const getExpiryZone = (expiredDate: string): { zone: ExpiryZone, monthsLeft: number, timeLeft: string } => {
  const now = new Date();
  const expiry = parseISO(expiredDate);
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
  const [expiringItems, setExpiringItems] = React.useState<ExpiringItem[]>([]);

  React.useEffect(() => {
    const classifiedItems = inventory.map(item => {
      const { zone, monthsLeft, timeLeft } = getExpiryZone(item.expiredDate);
      return { ...item, zone, monthsLeft, timeLeft };
    })
    .sort((a, b) => a.monthsLeft - b.monthsLeft);
    setExpiringItems(classifiedItems);
  }, []);

  const getBadgeClass = (zone: ExpiryZone) => {
    switch (zone) {
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
      No: index + 1,
      'Nama Item': item.itemName,
      'Tanggal Kadaluarsa': item.expiredDate,
      'Sisa Waktu': item.timeLeft,
      Status: item.zone,
    }));
    
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'expiring_stock_report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              Export CSV
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
