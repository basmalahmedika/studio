
'use client';

import * as React from 'react';
import Papa from 'papaparse';
import { DollarSign, FileDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { InventoryItem } from '@/lib/types';

type ItemType = 'Obat' | 'Alkes';

interface PriceAnalysisItem {
  itemName: string;
  suppliers: {
    supplier: string;
    price: number;
    isLowest: boolean;
  }[];
}

export function SupplierPriceAnalysis({ inventory }: { inventory: InventoryItem[] }) {
  const [activeTab, setActiveTab] = React.useState<ItemType>('Obat');

  const analysisData = React.useMemo(() => {
    const itemMap = new Map<string, { supplier: string; price: number }[]>();
    
    inventory
      .filter(item => item.itemType === activeTab)
      .forEach(item => {
        if (!itemMap.has(item.itemName)) {
          itemMap.set(item.itemName, []);
        }
        itemMap.get(item.itemName)?.push({ supplier: item.supplier, price: item.purchasePrice });
      });

    const result: PriceAnalysisItem[] = [];
    itemMap.forEach((suppliers, itemName) => {
      const minPrice = Math.min(...suppliers.map(s => s.price));
      result.push({
        itemName,
        suppliers: suppliers.map(s => ({ ...s, isLowest: s.price === minPrice })),
      });
    });

    return result.sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [inventory, activeTab]);

  const handleExportData = () => {
    const dataToExport = analysisData.flatMap(item => 
      item.suppliers.map(supplierInfo => ({
        'Item Name': item.itemName,
        'Supplier': supplierInfo.supplier,
        'Purchase Price': `Rp ${supplierInfo.price.toLocaleString('id-ID')}`,
        'Is Lowest Price': supplierInfo.isLowest ? 'Yes' : 'No',
      }))
    );
    
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `supplier_price_analysis_${activeTab.toLowerCase()}.csv`);
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
                <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    Supplier Price Comparison
                </CardTitle>
                <CardDescription>
                Compare purchase prices across different suppliers to find the most affordable option.
                </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportData}>
                <FileDown className="mr-2 h-4 w-4" />
                Export CSV
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ItemType)}>
          <TabsList>
            <TabsTrigger value="Obat">Obat</TabsTrigger>
            <TabsTrigger value="Alkes">Alkes</TabsTrigger>
          </TabsList>
          <TabsContent value={activeTab}>
            <div className="overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Purchase Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysisData.length > 0 ? (
                    analysisData.flatMap((item) =>
                      item.suppliers.map((supplierInfo, index) => (
                        <TableRow key={`${item.itemName}-${supplierInfo.supplier}`}>
                          {index === 0 && (
                            <TableCell rowSpan={item.suppliers.length} className="font-medium align-top">
                              {item.itemName}
                            </TableCell>
                          )}
                          <TableCell>{supplierInfo.supplier}</TableCell>
                          <TableCell className="text-right">
                            {supplierInfo.isLowest ? (
                              <Badge className="bg-green-600 text-white hover:bg-green-600/90">
                                Rp {supplierInfo.price.toLocaleString('id-ID')}
                              </Badge>
                            ) : (
                              `Rp ${supplierInfo.price.toLocaleString('id-ID')}`
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        No data available for {activeTab}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
