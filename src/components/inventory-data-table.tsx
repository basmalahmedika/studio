
'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, MoreHorizontal, Pen, Trash2, Upload, Download, FileDown } from 'lucide-react';
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import Papa from 'papaparse';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from '@/components/ui/input';
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/context/app-context';
import type { InventoryItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';


const inventorySchema = z.object({
  id: z.string().optional(),
  inputDate: z.date({
    required_error: "A date of input is required.",
  }),
  itemName: z.string().min(1, 'Item name is required'),
  batchNumber: z.string().min(1, 'Batch number is required'),
  itemType: z.enum(['Alkes', 'Obat']),
  category: z.enum(['Oral', 'Topikal', 'Injeksi', 'Suppositoria', 'Inhalasi/Nasal', 'Vaksin', 'Lainnya']),
  unit: z.enum(['Tablet', 'Kapsul', 'Vial', 'Amp', 'Pcs', 'Cm', 'Btl']),
  quantity: z.coerce.number().min(0, 'Quantity must be a positive number'),
  purchasePrice: z.coerce.number().min(0, 'Purchase price must be a positive number'),
  sellingPriceRJ: z.coerce.number().min(0, 'Selling price is required'),
  sellingPriceRI: z.coerce.number().min(0, 'Selling price is required'),
  expiredDate: z.date({
    required_error: "An expiration date is required.",
  }),
  supplier: z.string().min(1, 'Supplier is required'),
});

type InventoryFormValues = z.infer<typeof inventorySchema>;

export function InventoryDataTable() {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, bulkAddInventoryItems } = useAppContext();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      itemName: '',
      batchNumber: '',
      supplier: '',
      quantity: 0,
      purchasePrice: 0,
      sellingPriceRJ: 0,
      sellingPriceRI: 0,
      itemType: 'Obat',
      category: 'Oral',
      unit: 'Tablet',
    }
  });

  const onSubmit = async (values: InventoryFormValues) => {
    try {
        const formattedValues = {
          ...values,
          inputDate: format(values.inputDate, "yyyy-MM-dd"),
          expiredDate: format(values.expiredDate, "yyyy-MM-dd"),
        };
    
        if (values.id) {
          const { id, ...updateData } = formattedValues;
          await updateInventoryItem(id, updateData);
          toast({ title: "Success", description: "Item has been updated." });
        } else {
          const { id, ...createData } = formattedValues;
          await addInventoryItem(createData);
          toast({ title: "Success", description: "New item has been added." });
        }
        form.reset();
        setIsEditDialogOpen(false);
    } catch(error) {
       console.error("Error submitting form:", error);
       toast({ variant: "destructive", title: "Error", description: "An error occurred while saving the item." });
    }
  };

  const handleEdit = (item: InventoryItem) => {
    form.reset({
      ...item,
      inputDate: new Date(item.inputDate),
      expiredDate: new Date(item.expiredDate),
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
        await deleteInventoryItem(id);
        toast({ title: "Success", description: "Item has been deleted." });
    } catch(error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete item." });
    }
  }

  const handleOpenAddNew = () => {
    form.reset({
      itemName: '',
      batchNumber: '',
      supplier: '',
      quantity: 0,
      purchasePrice: 0,
      sellingPriceRJ: 0,
      sellingPriceRI: 0,
      itemType: 'Obat',
      category: 'Oral',
      unit: 'Tablet',
      inputDate: new Date(),
      expiredDate: new Date(),
    });
    setIsEditDialogOpen(true);
  }
  
 const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const parsedData = z.array(inventorySchema.omit({id: true})).parse(results.data.map((d: any) => ({
                ...d,
                inputDate: new Date(d.inputDate as string),
                expiredDate: new Date(d.expiredDate as string),
                quantity: Number(d.quantity),
                purchasePrice: Number(d.purchasePrice),
                sellingPriceRJ: Number(d.sellingPriceRJ),
                sellingPriceRI: Number(d.sellingPriceRI),
            })));
            
            const newItems = parsedData.map(item => ({
              ...item,
              inputDate: format(item.inputDate, "yyyy-MM-dd"),
              expiredDate: format(item.expiredDate, "yyyy-MM-dd"),
            }));

            await bulkAddInventoryItems(newItems);
            toast({ title: "Upload Successful", description: `${newItems.length} new items have been added.` });
          } catch (error) {
             if (error instanceof z.ZodError) {
                console.error("CSV validation error:", error.issues);
                toast({ variant: "destructive", title: "Upload Failed", description: "CSV data is invalid. Please check the file and try again." });
            } else {
                console.error("An unexpected error occurred:", error);
                toast({ variant: "destructive", title: "Upload Failed", description: "An unexpected error occurred during file processing." });
            }
          }
        },
        error: (error) => {
           toast({ variant: "destructive", title: "Upload Failed", description: error.message });
        }
      });
    }
    if (event.target) event.target.value = '';
  };
  
  const handleDownloadTemplate = () => {
    const headers = [
      'inputDate', 'itemName', 'batchNumber', 'itemType', 'category', 'unit', 
      'quantity', 'purchasePrice', 'sellingPriceRJ', 'sellingPriceRI', 'expiredDate', 'supplier'
    ];
    const csv = Papa.unparse([headers]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'inventory_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportData = () => {
    const csv = Papa.unparse(inventory);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'inventory_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle>Inventory List</CardTitle>
          <div className="flex flex-wrap gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".csv"
            />
             <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Upload CSV
            </Button>
             <Button variant="outline" onClick={handleExportData}>
              <FileDown className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenAddNew}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Item
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{form.getValues('id') ? 'Edit Item' : 'Add New Item'}</DialogTitle>
                  <DialogDescription>
                    Fill in the form below to add a new item to the inventory.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="itemName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Paracetamol 500mg" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="batchNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>No. Batch</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., B12345" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="inputDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Input Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                  }
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
                        name="itemType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Type</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select item type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Obat">Obat</SelectItem>
                                <SelectItem value="Alkes">Alkes</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                 <SelectItem value="Oral">Oral</SelectItem>
                                 <SelectItem value="Topikal">Topikal</SelectItem>
                                 <SelectItem value="Injeksi">Injeksi</SelectItem>
                                 <SelectItem value="Suppositoria">Suppositoria</SelectItem>
                                 <SelectItem value="Inhalasi/Nasal">Inhalasi/Nasal</SelectItem>
                                 <SelectItem value="Vaksin">Vaksin</SelectItem>
                                 <SelectItem value="Lainnya">Lainnya</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="unit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a unit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                 <SelectItem value="Tablet">Tablet</SelectItem>
                                 <SelectItem value="Kapsul">Kapsul</SelectItem>
                                 <SelectItem value="Vial">Vial</SelectItem>
                                 <SelectItem value="Amp">Amp</SelectItem>
                                 <SelectItem value="Pcs">Pcs</SelectItem>
                                 <SelectItem value="Cm">Cm</SelectItem>
                                 <SelectItem value="Btl">Btl</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="purchasePrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Purchase Price</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Rp 0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="sellingPriceRJ"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Selling Price (RJ)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Rp 0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="sellingPriceRI"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Selling Price (RI)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Rp 0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="expiredDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Expiration Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
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
                        name="supplier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Supplier</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Supplier A" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                          <Button type="button" variant="secondary">Cancel</Button>
                      </DialogClose>
                      <Button type="submit">Save changes</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>No. Batch</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Purchase Price</TableHead>
                <TableHead>Selling Price (RJ)</TableHead>
                <TableHead>Selling Price (RI)</TableHead>
                <TableHead>Expired</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.itemName}</TableCell>
                  <TableCell>{item.batchNumber}</TableCell>
                  <TableCell>{item.itemType}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>Rp {item.purchasePrice.toLocaleString('id-ID')}</TableCell>
                  <TableCell>Rp {item.sellingPriceRJ.toLocaleString('id-ID')}</TableCell>
                  <TableCell>Rp {item.sellingPriceRI.toLocaleString('id-ID')}</TableCell>
                  <TableCell>{item.expiredDate}</TableCell>
                  <TableCell>{item.supplier}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(item)}>
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
                                This action cannot be undone. This will permanently delete the item
                                from your inventory.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
