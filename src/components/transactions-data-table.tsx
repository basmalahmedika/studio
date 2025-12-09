
'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, MoreHorizontal, Pen, Trash2, CalendarIcon as CalendarIconLucide, X, FileDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { format } from "date-fns";
import * as XLSX from 'xlsx';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { Transaction, InventoryItem, TransactionItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const transactionItemSchema = z.object({
  itemId: z.string(),
  itemName: z.string(),
  quantity: z.coerce.number().min(1, 'Kuantitas minimal 1'),
  price: z.number(),
  stock: z.number(),
});

const transactionSchema = z.object({
  id: z.string().optional(),
  date: z.date(),
  medicalRecordNumber: z.string().min(1, 'Nomor rekam medis harus diisi'),
  patientType: z.enum(['Rawat Jalan', 'Rawat Inap', 'Lain-lain']),
  paymentMethod: z.enum(['UMUM', 'BPJS', 'Lain-lain']),
  items: z.array(transactionItemSchema).min(1, 'Minimal satu item harus ditambahkan'),
  totalPrice: z.number(),
});


type TransactionFormValues = z.infer<typeof transactionSchema>;

type GroupedTransaction = Transaction & {
    enrichedItems: (TransactionItem & {
        itemName: string;
        purchasePrice: number;
        margin: number;
        subtotal: number;
    })[]
};


export function TransactionsDataTable() {
  const { transactions, inventory, addTransaction, updateTransaction, deleteTransaction, filters } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [itemSearch, setItemSearch] = React.useState('');
  const [mrnFilter, setMrnFilter] = React.useState('');
  const { toast } = useToast();
  
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

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
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const watchedItems = form.watch('items');
  const patientType = form.watch('patientType');
  const paymentMethod = form.watch('paymentMethod');
  
  React.useEffect(() => {
    const total = watchedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    form.setValue('totalPrice', total);
  }, [watchedItems, form]);
  
  React.useEffect(() => {
    const currentItems = form.getValues('items');
    if (currentItems.length > 0) {
      const updatedItems = currentItems.map(cartItem => {
        const inventoryItem = inventory.find(i => i.id === cartItem.itemId);
        if (inventoryItem) {
          let newPrice;
          if (paymentMethod === 'BPJS' || paymentMethod === 'Lain-lain') {
            newPrice = inventoryItem.purchasePrice;
          } else {
            newPrice = patientType === 'Rawat Inap' ? inventoryItem.sellingPriceRI : inventoryItem.sellingPriceRJ;
          }
          return { ...cartItem, price: newPrice };
        }
        return cartItem;
      });
      form.setValue('items', updatedItems);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientType, paymentMethod, inventory]);


  const onSubmit = async (values: TransactionFormValues) => {
    const transactionData = {
      ...values, 
      date: format(values.date, "yyyy-MM-dd"),
      items: values.items.map(({ itemId, quantity, price }) => ({ itemId, quantity, price })),
    };

    try {
        if (values.id) {
          const { id, ...updateData } = transactionData;
          await updateTransaction(id!, updateData);
          toast({ title: "Sukses", description: "Transaksi telah diperbarui." });
        } else {
          const { id, ...createData } = transactionData;
          await addTransaction(createData);
          toast({ title: "Sukses", description: "Transaksi baru telah ditambahkan." });
        }
        form.reset();
        setIsDialogOpen(false);
    } catch (error: any) {
        console.error("Kesalahan Transaksi: ", error);
        toast({
            variant: "destructive",
            title: "Transaksi Gagal",
            description: error.message || "Terjadi kesalahan yang tidak terduga.",
        });
    }
  };
  
  const handleEdit = (transactionId: string) => {
     const transaction = transactions.find(t => t.id === transactionId);
     if (!transaction) return;

     const itemsInTransaction = (transaction.items || []).map(item => {
        const inventoryItem = inventory.find(i => i.id === item.itemId);
        const stockForEditing = inventoryItem ? (inventoryItem.quantity + (transaction.items?.find(ti => ti.itemId === item.itemId)?.quantity || 0)) : 0;
        return {
            ...item,
            price: item.price,
            itemName: inventoryItem?.itemName || 'Item Tidak Dikenal',
            stock: stockForEditing
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
  
  const handleDelete = async (transactionId: string) => {
    try {
        await deleteTransaction(transactionId);
        toast({ title: "Sukses", description: "Transaksi telah dihapus." });
    } catch(error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message || "Gagal menghapus transaksi." });
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
    const patientTypeValue = form.getValues('patientType');
    const paymentMethodValue = form.getValues('paymentMethod');
    
    if (item && !watchedItems.some(i => i.itemId === item.id)) {
       let price;
       if (paymentMethodValue === 'BPJS' || paymentMethodValue === 'Lain-lain') {
           price = item.purchasePrice;
       } else {
           price = patientTypeValue === 'Rawat Inap' ? item.sellingPriceRI : item.sellingPriceRJ;
       }
       append({ 
         itemId: item.id, 
         itemName: item.itemName, 
         quantity: 1, 
         price,
         stock: item.quantity
       });
    }
    setItemSearch(''); 
  }
  
  const groupedData = React.useMemo(() => {
    const filteredTransactions = transactions.filter((transaction) => {
       const transactionDate = new Date(transaction.date);
       transactionDate.setHours(0, 0, 0, 0);

       const fromDate = filters.date?.from ? new Date(filters.date.from) : null;
       if (fromDate) fromDate.setHours(0, 0, 0, 0);
      
       const toDate = filters.date?.to ? new Date(filters.date.to) : null;
       if (toDate) toDate.setHours(0, 0, 0, 0);

       const isDateInRange = fromDate && toDate 
        ? transactionDate >= fromDate && transactionDate <= toDate 
        : true;
      
      const mrnMatch = mrnFilter === '' || (transaction.medicalRecordNumber?.toLowerCase().includes(mrnFilter.toLowerCase()) ?? false);
      const patientTypeMatch = filters.patientType === 'all' || transaction.patientType === filters.patientType;
      const paymentMethodMatch = filters.paymentMethod === 'all' || transaction.paymentMethod === filters.paymentMethod;
      
      return isDateInRange && mrnMatch && patientTypeMatch && paymentMethodMatch;
    });

    return filteredTransactions.map((t): GroupedTransaction => {
      const enrichedItems = (t.items || []).map(item => {
        const inventoryItem = inventory.find(inv => inv.id === item.itemId);
        const purchasePrice = inventoryItem?.purchasePrice || 0;
        const sellingPrice = (t.paymentMethod === 'BPJS' || t.paymentMethod === 'Lain-lain') ? purchasePrice : item.price;
        const margin = sellingPrice - purchasePrice;
        const subtotal = sellingPrice * item.quantity;
        return {
          ...item,
          price: sellingPrice,
          itemName: inventoryItem?.itemName || 'Item Tidak Dikenal',
          purchasePrice,
          margin,
          subtotal,
        };
      });
      return { ...t, enrichedItems };
    });
  }, [transactions, inventory, filters, mrnFilter]);

  const handleExportData = () => {
    const dataToExport = groupedData.flatMap(t => {
        const recalculatedTotal = t.enrichedItems.reduce((sum, item) => sum + item.subtotal, 0);
        return t.enrichedItems.map(item => ({
            'Tanggal': t.date,
            'No. Rekam Medis': t.medicalRecordNumber,
            'Tipe Pasien': t.patientType,
            'Metode Pembayaran': t.paymentMethod,
            'Nama Item': item.itemName,
            'Kuantitas': item.quantity,
            'Harga Beli': item.purchasePrice,
            'Harga Jual': item.price,
            'Margin': item.margin,
            'Subtotal Item': item.subtotal,
            'Total Transaksi': recalculatedTotal,
        }))
    });

    if (dataToExport.length === 0) {
      toast({ variant: 'destructive', title: 'Ekspor Gagal', description: 'Tidak ada data untuk diekspor.'});
      return;
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');
    XLSX.writeFile(wb, 'riwayat_transaksi.xlsx');
  };

  const filteredInventory = React.useMemo(() => {
    if (!itemSearch) return [];
    return inventory.filter(item => 
      item.itemName.toLowerCase().includes(itemSearch.toLowerCase()) &&
      !watchedItems.some(cartItem => cartItem.itemId === item.id)
    );
  }, [itemSearch, watchedItems, inventory]);
  
  const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

  // Pagination Logic
  const totalItems = groupedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedData = groupedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle>Riwayat Transaksi</CardTitle>
          <div className="flex flex-wrap gap-2">
             <Button variant="outline" onClick={handleExportData}>
              <FileDown className="mr-2 h-4 w-4" />
              Ekspor Excel
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenAddNew}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Tambah Transaksi Baru
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{form.getValues('id') ? 'Ubah Transaksi' : 'Tambah Transaksi Baru'}</DialogTitle>
                  <DialogDescription>
                    Isi formulir di bawah ini untuk membuat transaksi baru.
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
                            <FormLabel>Tanggal Transaksi</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                                    {field.value ? (format(field.value, "PPP")) : (<span>Pilih tanggal</span>)}
                                    <CalendarIconLucide className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar 
                                  mode="single" 
                                  selected={field.value} 
                                  onSelect={field.onChange} 
                                  captionLayout="dropdown-buttons"
                                  fromYear={1900}
                                  toYear={new Date().getFullYear() + 5}
                                  initialFocus 
                                />
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
                              <FormLabel>No. Rekam Medis</FormLabel>
                              <FormControl>
                                <Input placeholder="cth., RM123456" {...field} />
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
                                <FormLabel>Tipe Pasien</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Pilih tipe pasien" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Rawat Jalan">Rawat Jalan</SelectItem>
                                    <SelectItem value="Rawat Inap">Rawat Inap</SelectItem>
                                    <SelectItem value="Lain-lain">Lain-lain</SelectItem>
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
                                <FormLabel>Metode Pembayaran</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Pilih metode pembayaran" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="UMUM">UMUM</SelectItem>
                                    <SelectItem value="BPJS">BPJS</SelectItem>
                                    <SelectItem value="Lain-lain">Lain-lain</SelectItem>
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Kasir</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                           <div className="relative">
                              <FormLabel>Tambah Item</FormLabel>
                              <Input
                                placeholder="Cari dan pilih item..."
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
                                      {item.itemName} (Stok: {item.quantity})
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
                           {form.formState.errors.items && <p className="text-sm font-medium text-destructive">{form.formState.errors.items?.message || (form.formState.errors.items as any)?.root?.message}</p>}
                           <div className="flex justify-end items-center pt-4 border-t">
                             <div className="text-lg font-bold">Total: Rp {form.getValues('totalPrice').toLocaleString('id-ID')}</div>
                           </div>
                        </div>
                      </CardContent>
                    </Card>

                    <DialogFooter>
                      <DialogClose asChild>
                          <Button type="button" variant="secondary">Batal</Button>
                      </DialogClose>
                      <Button type="submit">Simpan Transaksi</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
         <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari berdasarkan No. Rekam Medis..."
              className="w-full rounded-lg bg-background pl-8 md:w-[300px]"
              value={mrnFilter}
              onChange={(e) => setMrnFilter(e.target.value)}
            />
          </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Tanggal</TableHead>
                <TableHead>No. RM / Pasien</TableHead>
                <TableHead colSpan={5}>Detail Item</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((t) => {
                  const recalculatedTotal = t.enrichedItems.reduce((sum, item) => sum + item.subtotal, 0);
                  return (
                  <React.Fragment key={t.id}>
                    <TableRow className="bg-background hover:bg-background">
                      <TableCell className="font-medium">{t.date}</TableCell>
                      <TableCell>
                        <div>{t.medicalRecordNumber}</div>
                        <div className="text-xs text-muted-foreground">{t.patientType}</div>
                      </TableCell>
                      <TableCell colSpan={5}>
                        <Badge variant={(t.paymentMethod === 'BPJS' || t.paymentMethod === 'Lain-lain') ? 'secondary' : 'outline'}>
                            {t.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Buka menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(t.id)}>
                                  <Pen className="mr-2 h-4 w-4" />
                                  Ubah
                                </DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" className="w-full justify-start text-sm text-red-500 hover:text-red-500 hover:bg-red-50 p-2 font-normal">
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Hapus
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Apakah Anda benar-benar yakin?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tindakan ini tidak bisa dibatalkan. Ini akan menghapus transaksi secara permanen.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Batal</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(t.id)} className="bg-destructive hover:bg-destructive/90">
                                        Hapus
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {t.enrichedItems.map((item, itemIndex) => (
                        <TableRow key={item.itemId} className="bg-muted/50 hover:bg-muted/80">
                            <TableCell colSpan={2}></TableCell>
                            <TableCell className="font-medium">{item.itemName}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(item.subtotal)}</TableCell>
                            <TableCell colSpan={2}></TableCell>
                        </TableRow>
                    ))}
                     <TableRow>
                        <TableCell colSpan={5} className="text-right font-bold">Total Transaksi</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(recalculatedTotal)}</TableCell>
                        <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  </React.Fragment>
                )})
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    Tidak ada hasil yang ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
       <CardFooter>
        <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
          <div className="flex-1">
            Menampilkan {paginatedData.length > 0 ? Math.min((currentPage - 1) * itemsPerPage + 1, totalItems) : 0} sampai {Math.min(currentPage * itemsPerPage, totalItems)} dari {totalItems} transaksi.
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <span>Baris per halaman</span>
                 <Select
                    value={`${itemsPerPage}`}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue placeholder={itemsPerPage} />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[10, 25, 50, 100].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
             </div>
             <div className="w-20 text-center">
                Halaman {currentPage} dari {totalPages}
            </div>
            <div className="flex gap-2">
                 <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Halaman Sebelumnya</span>
                </Button>
                 <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <span className="sr-only">Halaman Berikutnya</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

    