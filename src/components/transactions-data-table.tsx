'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, MoreHorizontal, Pen, Trash2, CalendarIcon, X, FileDown } from 'lucide-react';
import { format } from "date-fns";
import Papa from 'papaparse';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useAppContext } from '@/context/app-context';
import type { Transaction, InventoryItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const transactionSchema = z.object({
  id: z.string().optional(),
  date: z.date(),
  medicalRecordNumber: z.string().min(1, 'Medical record number is required'),
  patientType: z.enum(['Rawat Jalan', 'Rawat Inap']),
  paymentMethod: z.enum(['UMUM', 'BPJS']),
  items: z.array(z.object({
    itemId: z.string(),
    itemName: z.string(),
    quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
    price: z.number(),
    stock: z.number(),
  })).min(1, 'At least one item is required'),
  totalPrice: z.number(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export function TransactionsDataTable() {
  const { transactions, inventory, addTransaction, updateTransaction, deleteTransaction } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [itemSearch, setItemSearch] = React.useState('');
  const { toast } = useToast();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date(),
      items: [],
      patientType: 'Rawat Jalan',
      paymentMethod: 'UMUM',
      totalPrice: 0,
      medicalRecordNumber: '',
    },
  });
  
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const watchedItems = form.watch('items');
  const paymentMethod = form.watch('paymentMethod');

  React.useEffect(() => {
    const total = watchedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    form.setValue('totalPrice', total);
  }, [watchedItems, form]);
  
  React.useEffect(() => {
    if (watchedItems.length > 0) {
      watchedItems.forEach((cartItem, index) => {
          const inventoryItem = inventory.find(i => i.id === cartItem.itemId);
          if (inventoryItem) {
              const newPrice = paymentMethod === 'BPJS' ? inventoryItem.purchasePrice : inventoryItem.sellingPrice;
              if (cartItem.price !== newPrice) {
                update(index, { ...cartItem, price: newPrice });
              }
          }
      });
    }
  }, [paymentMethod, inventory, update, watchedItems]);

  const onSubmit = (values: TransactionFormValues) => {
    // Check if any item quantity exceeds available stock
    for (const item of values.items) {
        if (item.quantity > item.stock) {
            toast({
                variant: "destructive",
                title: "Insufficient Stock",
                description: `Quantity for ${item.itemName} exceeds available stock of ${item.stock}.`,
            });
            return;
        }
    }

    const transactionData: Omit<Transaction, 'id'> = {
      date: format(values.date, "yyyy-MM-dd"),
      medicationName: values.items.map(i => `${i.itemName} (x${i.quantity})`).join(', '),
      quantity: values.items.reduce((sum, item) => sum + item.quantity, 0),
      type: 'OUT',
      patientType: values.patientType,
      paymentMethod: values.paymentMethod,
      context: `MRN: ${values.medicalRecordNumber}`, 
      totalPrice: values.totalPrice,
      medicalRecordNumber: values.medicalRecordNumber || '',
      items: values.items.map(({ itemId, quantity, price }) => ({ itemId, quantity, price })),
    };

    if (values.id) {
      const originalTransaction = transactions.find(t => t.id === values.id);
      if (originalTransaction) {
        updateTransaction(values.id, { id: values.id, ...transactionData }, originalTransaction);
        toast({ title: "Success", description: "Transaction has been updated." });
      }
    } else {
      addTransaction(transactionData);
      toast({ title: "Success", description: "New transaction has been added." });
    }
    form.reset();
    setIsDialogOpen(false);
  };
  
  const handleEdit = (transaction: Transaction) => {
     const itemsInTransaction = (transaction.items || []).map(item => {
        const inventoryItem = inventory.find(i => i.id === item.itemId);
        return {
            ...item,
            itemName: inventoryItem?.itemName || 'Unknown Item',
            stock: inventoryItem?.quantity || 0,
        };
    });

    form.reset({
        id: transaction.id,
        date: new Date(transaction.date),
        medicalRecordNumber: transaction.medicalRecordNumber || '',
        patientType: transaction.patientType,
        paymentMethod: transaction.paymentMethod,
        items: itemsInTransaction,
        totalPrice: transaction.totalPrice,
    });
    setIsDialogOpen(true);
};
  
  const handleDelete = (id: string) => {
    const transactionToDelete = transactions.find(t => t.id === id);
    if (transactionToDelete) {
        deleteTransaction(id, transactionToDelete);
        toast({ title: "Success", description: "Transaction has been deleted." });
    }
  }

  const handleOpenAddNew = () => {
    form.reset({
      date: new Date(),
      items: [],
      patientType: 'Rawat Jalan',
      paymentMethod: 'UMUM',
      totalPrice: 0,
      medicalRecordNumber: '',
    });
    setIsDialogOpen(true);
  }

  const handleAddItem = (item: InventoryItem) => {
    const paymentMethodValue = form.getValues('paymentMethod');
    
    if (item && !watchedItems.some(i => i.itemId === item.id)) {
       const price = paymentMethodValue === 'BPJS' ? item.purchasePrice : item.sellingPrice;
       append({ 
         itemId: item.id, 
         itemName: item.itemName, 
         quantity: 1, 
         price,
         stock: item.quantity
       });
    }
    setItemSearch(''); // Clear search after adding
  }
  
  const handleExportData = () => {
    const csv = Papa.unparse(transactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'transactions_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const [filters, setFilters] = React.useState({
    medicationName: '',
    patientType: 'all',
    paymentMethod: 'all',
  });

  const handleFilterChange = (
    key: 'medicationName' | 'patientType' | 'paymentMethod',
    value: string
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };
  
  const filteredData = React.useMemo(() => {
    return transactions.filter((transaction) => {
      const nameMatch = transaction.medicationName
        .toLowerCase()
        .includes(filters.medicationName.toLowerCase());
      const patientTypeMatch =
        filters.patientType === 'all' || transaction.patientType === filters.patientType;
      const paymentMethodMatch =
        filters.paymentMethod === 'all' || transaction.paymentMethod === filters.paymentMethod;
      return nameMatch && patientTypeMatch && paymentMethodMatch;
    });
  }, [transactions, filters]);

  const filteredInventory = React.useMemo(() => {
    if (!itemSearch) return [];
    return inventory.filter(item => 
      item.itemName.toLowerCase().includes(itemSearch.toLowerCase()) &&
      !watchedItems.some(cartItem => cartItem.itemId === item.id)
    );
  }, [itemSearch, watchedItems, inventory]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle>Transaction Log</CardTitle>
          <div className="flex flex-wrap gap-2">
             <Button variant="outline" onClick={handleExportData}>
              <FileDown className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenAddNew}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{form.getValues('id') ? 'Edit Transaction' : 'Add New Transaction'}</DialogTitle>
                  <DialogDescription>
                    Fill in the form below to create a new transaction.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                       <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Transaction Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                                    {field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                          control={form.control}
                          name="medicalRecordNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>No. Medical Record</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., MR123456" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                       <FormField
                          control={form.control}
                          name="patientType"
                          render={({ field }) => (
                             <FormItem>
                                <FormLabel>Patient Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Select patient type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Rawat Jalan">Rawat Jalan</SelectItem>
                                    <SelectItem value="Rawat Inap">Rawat Inap</SelectItem>
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="paymentMethod"
                          render={({ field }) => (
                             <FormItem>
                                <FormLabel>Payment Method</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Select payment method" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="UMUM">UMUM</SelectItem>
                                    <SelectItem value="BPJS">BPJS</SelectItem>
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Cashier</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                           <div className="relative">
                              <FormLabel>Add Item</FormLabel>
                              <Input
                                placeholder="Search and select an item..."
                                value={itemSearch}
                                onChange={(e) => setItemSearch(e.target.value)}
                              />
                               {filteredInventory.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                                  {filteredInventory.map(item => (
                                    <div 
                                      key={item.id} 
                                      onClick={() => handleAddItem(item)}
                                      className="px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                                    >
                                      {item.itemName} (Stock: {item.quantity})
                                    </div>
                                  ))}
                                </div>
                              )}
                           </div>
                           <div className="space-y-2">
                            {fields.map((item, index) => (
                              <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted">
                                  <div className="flex-1 font-medium">{item.itemName}</div>
                                  <div className="w-40">
                                      <FormField
                                        control={form.control}
                                        name={`items.${index}.quantity`}
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormControl>
                                              <Input type="number" {...field} className="h-8" />
                                            </FormControl>
                                          </FormItem>
                                        )}
                                      />
                                  </div>
                                  <div className="w-32 text-right">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</div>
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => remove(index)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                              </div>
                            ))}
                           </div>
                           {form.formState.errors.items && <p className="text-sm font-medium text-destructive">{form.formState.errors.items?.message}</p>}
                           <div className="flex justify-end items-center pt-4 border-t">
                             <div className="text-lg font-bold">Total: Rp {form.getValues('totalPrice').toLocaleString('id-ID')}</div>
                           </div>
                        </div>
                      </CardContent>
                    </Card>

                    <DialogFooter>
                      <DialogClose asChild>
                          <Button type="button" variant="secondary">Cancel</Button>
                      </DialogClose>
                      <Button type="submit">Save Transaction</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
          <Input
            placeholder="Filter by medication..."
            value={filters.medicationName}
            onChange={(e) => handleFilterChange('medicationName', e.target.value)}
            className="max-w-sm"
          />
          <Select
            value={filters.patientType}
            onValueChange={(value) => handleFilterChange('patientType', value)}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Patient Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Patient Types</SelectItem>
              <SelectItem value="Rawat Jalan">Rawat Jalan</SelectItem>
              <SelectItem value="Rawat Inap">Rawat Inap</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.paymentMethod}
            onValueChange={(value) => handleFilterChange('paymentMethod', value)}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Payment Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payment Methods</SelectItem>
              <SelectItem value="BPJS">BPJS</SelectItem>
              <SelectItem value="UMUM">UMUM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>No. Medical Record</TableHead>
                <TableHead>Medication/Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Patient Type</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right">Total Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length > 0 ? (
                filteredData.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.date}</TableCell>
                    <TableCell>{transaction.medicalRecordNumber}</TableCell>
                    <TableCell className="font-medium max-w-xs truncate">{transaction.medicationName}</TableCell>
                    <TableCell>{transaction.quantity}</TableCell>
                    <TableCell>{transaction.patientType}</TableCell>
                    <TableCell>
                      <Badge variant={transaction.paymentMethod === 'BPJS' ? 'secondary' : 'outline'}>
                        {transaction.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      Rp {transaction.totalPrice.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(transaction)}>
                             <Pen className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                           <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" className="w-full justify-start text-sm text-red-500 hover:text-red-500 hover:bg-red-50 p-2 font-normal">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the transaction.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(transaction.id)} className="bg-destructive hover:bg-destructive/90">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No results found.
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
