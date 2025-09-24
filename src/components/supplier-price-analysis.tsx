
'use client';

import * as React from 'react';
import * as XLSX from 'xlsx';
import { DollarSign, FileDown, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { InventoryItem } from '@/lib/types';
import { Input } from '@/components/ui/input';

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
  const [searchTerm, setSearchTerm] = React.useState('');

  const analysisData = React.useMemo(() => {
    const itemMap = new Map<string, { supplier: string; price: number }[]>();
    
    inventory
      .filter(item => 
        item.itemType === activeTab &&
        item.itemName.toLowerCase().includes(searchTerm.toLowerCase())
      )
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
  }, [inventory, activeTab, searchTerm]);

  const handleExportData = () => {
    const dataToExport = analysisData.flatMap(item => 
      item.suppliers.map(supplierInfo => ({
        'Item Name': item.itemName,
        'Supplier': supplierInfo.supplier,
        'Purchase Price': supplierInfo.price,
        'Is Lowest Price': supplierInfo.isLowest ? 'Yes' : 'No',
      }))
    );
    
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Price Analysis ${activeTab}`);

    ws['!cols'] = [
        { wch: 30 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
    ];
    
    XLSX.writeFile(wb, `supplier_price_analysis_${activeTab.toLowerCase()}.xlsx`);
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
                Export Excel
            </Button>
        </div>
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by item name..."
              className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
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
