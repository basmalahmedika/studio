
'use client';

import * as React from 'react';
import * as XLSX from 'xlsx';
import { FileDown } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import type { Transaction, TransactionItem } from '@/lib/types';
import { useAppContext } from '@/context/app-context';

type AnalysisCategory = 'A' | 'B' | 'C';
type ItemTypeFilter = 'all' | 'Obat' | 'Alkes';

interface AnalyzedItem {
  name: string;
  totalSales: number;
  remainingStock: number;
  contributionPercent: number;
  cumulativePercent: number;
  category: AnalysisCategory;
}

interface AbcAnalysisProps {
  transactions: Transaction[];
  itemTypeFilter: ItemTypeFilter;
}

const getCategory = (cumulativePercent: number): AnalysisCategory => {
  if (cumulativePercent <= 80) {
    return 'A'; // Fast Moving
  } else if (cumulativePercent <= 95) {
    return 'B'; // Medium Moving
  } else {
    return 'C'; // Slow Moving
  }
};

export function AbcAnalysis({ transactions, itemTypeFilter }: AbcAnalysisProps) {
  const { inventory } = useAppContext();
  const [analyzedItems, setAnalyzedItems] = React.useState<AnalyzedItem[]>([]);

  React.useEffect(() => {
    if (inventory.length === 0) {
      setAnalyzedItems([]);
      return;
    }

    // 1. Aggregate sales and stock data for each item
    const itemData = inventory.reduce((acc, invItem) => {
        if (itemTypeFilter === 'all' || invItem.itemType === itemTypeFilter) {
            if (!acc[invItem.itemName]) {
                acc[invItem.itemName] = { totalSales: 0, remainingStock: 0 };
            }
            acc[invItem.itemName].remainingStock += invItem.quantity;
        }
        return acc;
    }, {} as Record<string, { totalSales: number; remainingStock: number }>);
    
    transactions.forEach(t => {
      if (t.items) {
        t.items.forEach((item: TransactionItem) => {
          const inventoryItem = inventory.find(inv => inv.id === item.itemId);
          if (inventoryItem && (itemTypeFilter === 'all' || inventoryItem.itemType === itemTypeFilter)) {
            const itemName = inventoryItem.itemName;
            if (itemData[itemName]) {
                 const itemValue = item.price * item.quantity;
                 itemData[itemName].totalSales += itemValue;
            }
          }
        });
      }
    });

    // 2. Sort items by total sales in descending order
    const sortedItems = Object.entries(itemData)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.totalSales - a.totalSales);
      
    const totalSalesOverall = sortedItems.reduce((sum, item) => sum + item.totalSales, 0);
    
    // 3. Calculate cumulative percentage and assign category
    let cumulativeSales = 0;
    const classifiedItems = sortedItems.map(item => {
      cumulativeSales += item.totalSales;
      const contributionPercent = totalSalesOverall > 0 ? (item.totalSales / totalSalesOverall) * 100 : 0;
      const cumulativePercent = totalSalesOverall > 0 ? (cumulativeSales / totalSalesOverall) * 100 : 0;
      return {
        ...item,
        contributionPercent,
        cumulativePercent,
        category: getCategory(cumulativePercent),
      };
    });
    
    setAnalyzedItems(classifiedItems);
  }, [transactions, inventory, itemTypeFilter]);

  const getBadgeClass = (category: AnalysisCategory) => {
    switch (category) {
      case 'A': return 'bg-green-600 text-white hover:bg-green-600/90';
      case 'B': return 'bg-yellow-500 text-black hover:bg-yellow-500/90';
      case 'C': return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getCategoryLabel = (category: AnalysisCategory) => {
    switch(category) {
      case 'A': return 'Fast Moving';
      case 'B': return 'Medium Moving';
      case 'C': return 'Slow Moving';
    }
  }

  const handleExportData = () => {
    const dataToExport = analyzedItems.map(item => ({
      'Item Name': item.name,
      'Total Sales': item.totalSales,
      'Sisa Stok': item.remainingStock,
      'Contribution (%)': item.contributionPercent,
      'Cumulative (%)': item.cumulativePercent,
      'Category': getCategoryLabel(item.category),
    }));
    
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ABC Analysis');
    
    // Set column widths
    ws['!cols'] = [
        { wch: 30 }, // Item Name
        { wch: 15 }, // Total Sales
        { wch: 10 }, // Sisa Stok
        { wch: 15 }, // Contribution
        { wch: 15 }, // Cumulative
        { wch: 15 }, // Category
    ];

    XLSX.writeFile(wb, 'abc_analysis_report.xlsx');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className='space-y-1.5'>
                <CardTitle>ABC Analysis</CardTitle>
                <CardDescription>
                Classification of items based on sales contribution.
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
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Sisa Stok</TableHead>
                  <TableHead className="text-right">Total Sales</TableHead>
                  <TableHead className="text-right">Contribution</TableHead>
                  <TableHead className="text-right">Cumulative</TableHead>
                  <TableHead className="text-right">Category</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {analyzedItems.length > 0 ? (
                    analyzedItems.map((item) => (
                    <TableRow key={item.name}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">{item.remainingStock}</TableCell>
                        <TableCell className="text-right">Rp {item.totalSales.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="text-right">{item.contributionPercent.toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{item.cumulativePercent.toFixed(2)}%</TableCell>
                        <TableCell className="text-right">
                        <Badge className={getBadgeClass(item.category)}>{getCategoryLabel(item.category)}</Badge>
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            No data available for the selected filters.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
