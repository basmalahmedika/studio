'use client';

import * as React from 'react';
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
import { transactions } from '@/lib/data';

type AnalysisCategory = 'A' | 'B' | 'C';

interface AnalyzedItem {
  name: string;
  totalSales: number;
  cumulativePercent: number;
  category: AnalysisCategory;
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

export function AbcAnalysis() {
  const [analyzedItems, setAnalyzedItems] = React.useState<AnalyzedItem[]>([]);

  React.useEffect(() => {
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
      const cumulativePercent = (cumulativeSales / totalSalesOverall) * 100;
      return {
        ...item,
        cumulativePercent,
        category: getCategory(cumulativePercent),
      };
    });
    
    setAnalyzedItems(classifiedItems);
  }, []);

  const getBadgeClass = (category: AnalysisCategory) => {
    switch (category) {
      case 'A':
        return 'bg-destructive text-destructive-foreground'; // Fast
      case 'B':
        return 'bg-yellow-500 text-black'; // Medium
      case 'C':
        return 'bg-green-600 text-white'; // Slow
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getCategoryLabel = (category: AnalysisCategory) => {
    switch(category) {
      case 'A': return 'Fast Moving';
      case 'B': return 'Medium Moving';
      case 'C': return 'Slow Moving';
    }
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>ABC Analysis</CardTitle>
        <CardDescription>
          Classification of items based on sales contribution.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto max-h-96">
            <Table>
            <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Category</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {analyzedItems.map((item) => (
                <TableRow key={item.name}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">
                      <Badge className={getBadgeClass(item.category)}>{getCategoryLabel(item.category)}</Badge>
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
