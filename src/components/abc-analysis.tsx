
'use client';

import * as React from 'react';
import Papa from 'papaparse';
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
import type { Transaction } from '@/lib/types';

type AnalysisCategory = 'A' | 'B' | 'C';

interface AnalyzedItem {
  name: string;
  totalSales: number;
  contributionPercent: number;
  cumulativePercent: number;
  category: AnalysisCategory;
}

interface AbcAnalysisProps {
  transactions: Transaction[];
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

export function AbcAnalysis({ transactions }: AbcAnalysisProps) {
  const [analyzedItems, setAnalyzedItems] = React.useState<AnalyzedItem[]>([]);

  React.useEffect(() => {
    if (transactions.length === 0) {
      setAnalyzedItems([]);
      return;
    }

    // 1. Aggregate sales data for each item
    const salesByItem = transactions.reduce((acc, t) => {
      const items = t.medicationName.split(', ').map(itemStr => {
        const match = itemStr.match(/(.+) \(x\d+\)/);
        return match ? match[1] : itemStr; // Extract item name
      });
      
      items.forEach(itemName => {
         acc[itemName] = (acc[itemName] || 0) + t.totalPrice / items.length; // Approximate value per item in transaction
      });

      return acc;
    }, {} as Record<string, number>);

    // 2. Sort items by total sales in descending order
    const sortedItems = Object.entries(salesByItem)
      .map(([name, totalSales]) => ({ name, totalSales }))
      .sort((a, b) => b.totalSales - a.totalSales);
      
    const totalSalesOverall = sortedItems.reduce((sum, item) => sum + item.totalSales, 0);
    
    // 3. Calculate cumulative percentage and assign category
    let cumulativeSales = 0;
    const classifiedItems = sortedItems.map(item => {
      cumulativeSales += item.totalSales;
      const contributionPercent = (item.totalSales / totalSalesOverall) * 100;
      const cumulativePercent = (cumulativeSales / totalSalesOverall) * 100;
      return {
        ...item,
        contributionPercent,
        cumulativePercent,
        category: getCategory(cumulativePercent),
      };
    });
    
    setAnalyzedItems(classifiedItems);
  }, [transactions]);

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
      'Total Sales': `Rp ${item.totalSales.toLocaleString('id-ID')}`,
      'Contribution (%)': `${item.contributionPercent.toFixed(2)}%`,
      'Cumulative (%)': `${item.cumulativePercent.toFixed(2)}%`,
      'Category': getCategoryLabel(item.category),
    }));
    
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'abc_analysis_report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                Export CSV
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto max-h-96">
            <Table>
            <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
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
                        <TableCell colSpan={5} className="h-24 text-center">
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
