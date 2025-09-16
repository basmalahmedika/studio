'use client';

import * as React from 'react';
import { differenceInMonths, parseISO } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { inventory } from '@/lib/data';
import type { InventoryItem } from '@/lib/types';
import { Clock } from 'lucide-react';

type ExpiryZone = 'Aman' | 'Waspada' | 'Kritis';

interface ExpiringItem extends InventoryItem {
  zone: ExpiryZone;
  monthsLeft: number;
}

const getExpiryZone = (expiredDate: string): { zone: ExpiryZone, monthsLeft: number } => {
  const now = new Date();
  const expiry = parseISO(expiredDate);
  const monthsLeft = differenceInMonths(expiry, now);

  if (monthsLeft < 6) {
    return { zone: 'Kritis', monthsLeft };
  } else if (monthsLeft >= 6 && monthsLeft <= 12) {
    return { zone: 'Waspada', monthsLeft };
  } else {
    return { zone: 'Aman', monthsLeft };
  }
};

export function ExpiringStockReport() {
  const [expiringItems, setExpiringItems] = React.useState<ExpiringItem[]>([]);

  React.useEffect(() => {
    const classifiedItems = inventory.map(item => {
      const { zone, monthsLeft } = getExpiryZone(item.expiredDate);
      return { ...item, zone, monthsLeft };
    })
    .sort((a, b) => a.monthsLeft - b.monthsLeft);
    setExpiringItems(classifiedItems);
  }, []);

  const getBadgeVariant = (zone: ExpiryZone) => {
    switch (zone) {
      case 'Kritis':
        return 'destructive';
      case 'Waspada':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Expiring Stock Report
        </CardTitle>
        <CardDescription>
          Stock classified by expiration date proximity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto max-h-96">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Expired Date</TableHead>
                <TableHead className="text-right">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {expiringItems.map((item) => (
                <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.itemName}</TableCell>
                    <TableCell>{item.expiredDate}</TableCell>
                    <TableCell className="text-right">
                    <Badge variant={getBadgeVariant(item.zone)}>{item.zone}</Badge>
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
