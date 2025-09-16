'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, MoreHorizontal, Pen, Trash2, CalendarIcon, X } from 'lucide-react';
import { format } from "date-fns";
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
import { transactions, inventory } from '@/lib/data';
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
  })).min(1, 'At least one item is required'),
  totalPrice: z.number(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export function TransactionsDataTable() {
  const [data, setData] = React.useState<Transaction[]>(transactions);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      items: [],
      patientType: 'Rawat Jalan',
      paymentMethod: 'UMUM',
    },
  });
  
  const { fields, append, remove, control } = form.control;
  const watchedItems = form.watch('items');

  React.useEffect(() => {
    const total = watchedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    form.setValue('totalPrice', total);
  }, [watchedItems, form]);

  const onSubmit = (values: TransactionFormValues) => {
    // This is a simplified approach. In a real app, you would create
    // a separate transaction for each item or structure the data differently.
    // For this prototype, we'll just use the first item's name for the main transaction record.
    const newOrUpdatedTransaction: Transaction = {
      id: values.id || `trx${String(data.length + 1).padStart(3, '0')}`,
      date: format(values.date, "yyyy-MM-dd"),
      medicationName: values.items.map(i => `${i.itemName} (x${i.quantity})`).join(', '),
      quantity: values.items.reduce((sum, item) => sum + item.quantity, 0),
      type: 'OUT',
      patientType: values.patientType,
      paymentMethod: values.paymentMethod,
      context: `MRN: ${values.medicalRecordNumber}`, // Store MRN in context
      totalPrice: values.totalPrice,
      medicalRecordNumber: values.medicalRecordNumber,
    };

    if (values.id) {
      setData(data.map(item => item.id === values.id ? newOrUpdatedTransaction : item));
      toast({ title: "Success", description: "Transaction has been updated." });
    } else {
      setData([newOrUpdatedTransaction, ...data]);
      toast({ title: "Success", description: "New transaction has been added." });
    }
    form.reset({ items: [], patientType: 'Rawat Jalan', paymentMethod: 'UMUM' });
    setIsDialogOpen(false);
  };
  
  const handleEdit = (transaction: Transaction) => {
     // Note: This is a simplified edit. It doesn't reconstruct the full item list
     // from the `medicationName` string. A real implementation would need to store
     // transaction items separately.
    form.reset({
      id: transaction.id,
      date: new Date(transaction.date),
      medicalRecordNumber: transaction.medicalRecordNumber || 'N/A',
      patientType: transaction.patientType,
      paymentMethod: transaction.paymentMethod,
      items: [{
          itemId: inventory.find(i => i.itemName === transaction.medicationName)?.id || 'unknown',
          itemName: transaction.medicationName.split(' (x')[0],
          quantity: transaction.quantity,
          price: transaction.totalPrice / transaction.quantity
      }],
      totalPrice: transaction.totalPrice
    });
    setIsDialogOpen(true);
  };
  
  const handleDelete = (id: string) => {
    setData(data.filter(item => item.id !== id));
    toast({ title: "Success", description: "Transaction has been deleted." });
  }

  const handleOpenAddNew = () => {
    form.reset({ items: [], patientType: 'Rawat Jalan', paymentMethod: 'UMUM' });
    setIsDialogOpen(true);
  }

  const handleAddItem = (itemId: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (item && !watchedItems.some(i => i.itemId === itemId)) {
       form.setValue('items', [...watchedItems, { itemId: item.id, itemName: item.itemName, quantity: 1, price: item.sellingPrice }]);
    }
  }

  const handleRemoveItem = (index: number) => {
    const newItems = [...watchedItems];
    newItems.splice(index, 1);
    form.setValue('items', newItems);
  }

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
    return data.filter((transaction) => {
      const nameMatch = transaction.medicationName
        .toLowerCase()
        .includes(filters.medicationName.toLowerCase());
      const patientTypeMatch =
        filters.patientType === 'all' || transaction.patientType === filters.patientType;
      const paymentMethodMatch =
        filters.paymentMethod === 'all' || transaction.paymentMethod === filters.paymentMethod;
      return nameMatch && patientTypeMatch && paymentMethodMatch;
    });
  }, [data, filters]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle>Transaction Log</CardTitle>
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
                           <div>
                              <Label>Add Item</Label>
                               <Select onValueChange={handleAddItem}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Search and select an item..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {inventory.map(item => (
                                      <SelectItem key={item.id} value={item.id} disabled={watchedItems.some(i => i.itemId === item.id)}>
                                        {item.itemName} (Stock: {item.quantity})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                           </div>
                           <div className="space-y-2">
                            {watchedItems.map((item, index) => (
                              <div key={index} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted">
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
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleRemoveItem(index)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                              </div>
                            ))}
                           </div>
                           {form.formState.errors.items && <p className="text-sm font-medium text-destructive">{form.formState.errors.items.message}</p>}
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
                          <DropdownMenuItem onClick={() => handleEdit(transaction)} disabled>
                             <Pen className="mr-2 h-4 w-4" />
                            Edit (Coming Soon)
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
                  <TableCell colSpan={7} className="h-24 text-center">
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
