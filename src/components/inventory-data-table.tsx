
'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, MoreHorizontal, Pen, Trash2, Upload, Download, FileDown } from 'lucide-react';
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import * as XLSX from 'xlsx';

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

// Schema for Excel import validation
const excelRowSchema = z.object({
  inputDate: z.any().refine(val => val, { message: "inputDate is required" }),
  itemName: z.string({ required_error: "itemName is required" }).min(1, "itemName is required"),
  batchNumber: z.any().refine(val => val !== null && val !== undefined, { message: "batchNumber is required" }).transform(val => String(val)),
  itemType: z.enum(['Alkes', 'Obat'], { errorMap: () => ({ message: "itemType must be 'Alkes' or 'Obat'" }) }),
  category: z.enum(['Oral', 'Topikal', 'Injeksi', 'Suppositoria', 'Inhalasi/Nasal', 'Vaksin', 'Lainnya'], { errorMap: () => ({ message: "Invalid category value" }) }),
  unit: z.enum(['Tablet', 'Kapsul', 'Vial', 'Amp', 'Pcs', 'Cm', 'Btl'], { errorMap: () => ({ message: "Invalid unit value" }) }),
  quantity: z.any().pipe(z.coerce.number({ invalid_type_error: "quantity must be a number" }).min(0, "quantity must be non-negative")),
  purchasePrice: z.any().pipe(z.coerce.number({ invalid_type_error: "purchasePrice must be a number" }).min(0, "purchasePrice must be non-negative")),
  sellingPriceRJ: z.any().pipe(z.coerce.number({ invalid_type_error: "sellingPriceRJ must be a number" }).min(0, "sellingPriceRJ must be non-negative")),
  sellingPriceRI: z.any().pipe(z.coerce.number({ invalid_type_error: "sellingPriceRI must be a number" }).min(0, "sellingPriceRI must be non-negative")),
  expiredDate: z.any().refine(val => val, { message: "expiredDate is required" }),
  supplier: z.string({ required_error: "supplier is required" }).min(1, "supplier is required"),
});


const excelSerialDateToJSDate = (serial: number): Date => {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);

  const fractional_day = serial - Math.floor(serial) + 0.0000001;

  let total_seconds = Math.floor(86400 * fractional_day);
  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;

  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
};

const parseDateFromExcel = (dateValue: any): Date | null => {
  if (dateValue === null || typeof dateValue === 'undefined') return null;

  // Handle JS Date object
  if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
    return dateValue;
  }
  
  // Handle Excel serial number
  if (typeof dateValue === 'number') {
    return excelSerialDateToJSDate(dateValue);
  }
  
  // Handle string 'dd/mm/yyyy'
  if (typeof dateValue === 'string') {
    const parts = dateValue.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const date = new Date(year, month, day);
        // Basic validation to check if date is valid
        if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
          return date;
        }
      }
    }
  }

  // Fallback for other string formats
  const parsedDate = new Date(dateValue);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate;
  }
  
  return null;
};


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
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { raw: false }); // Use raw: false to get formatted text

          const newItems = [];

          for (let i = 0; i < json.length; i++) {
            const row = json[i] as any;
            const rowIndex = i + 2; // Excel rows are 1-based, plus header

            const validationResult = excelRowSchema.safeParse(row);

            if (!validationResult.success) {
              const firstError = validationResult.error.issues[0];
              const columnName = firstError.path.join('.');
              throw new Error(`Error on row ${rowIndex}: For column '${columnName}', ${firstError.message}`);
            }
            
            const { data: validatedData } = validationResult;
            
            const inputDate = parseDateFromExcel(validatedData.inputDate);
            const expiredDate = parseDateFromExcel(validatedData.expiredDate);

            if (!inputDate) {
              throw new Error(`Error on row ${rowIndex}: Invalid or missing inputDate. Please use dd/mm/yyyy format.`);
            }
            if (!expiredDate) {
              throw new Error(`Error on row ${rowIndex}: Invalid or missing expiredDate. Please use dd/mm/yyyy format.`);
            }

            newItems.push({
              ...validatedData,
              inputDate: format(inputDate, "yyyy-MM-dd"),
              expiredDate: format(expiredDate, "yyyy-MM-dd"),
            });
          }

          if (newItems.length > 0) {
            await bulkAddInventoryItems(newItems);
            toast({ title: "Upload Successful", description: `${newItems.length} new items have been added.` });
          } else {
            toast({ variant: "destructive", title: "Upload Info", description: "No new items found in the file to upload." });
          }

        } catch (error: any) {
           console.error("File processing error:", error);
           toast({ variant: "destructive", title: "Upload Failed", description: error.message || "An unexpected error occurred while processing the file.", duration: 10000 });
        } finally {
            if (event.target) {
                event.target.value = '';
            }
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };
  
  const handleDownloadTemplate = () => {
    const headers = [
      'inputDate', 'itemName', 'batchNumber', 'itemType', 'category', 'unit',
      'quantity', 'purchasePrice', 'sellingPriceRJ', 'sellingPriceRI', 'expiredDate', 'supplier'
    ];
    
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    
    // Define column formats
    const columnFormats: { [key: string]: string } = {
      A: 'dd/mm/yyyy', // inputDate
      B: '@',          // itemName (Text)
      C: '@',          // batchNumber (Text)
      D: '@',          // itemType (Text)
      E: '@',          // category (Text)
      F: '@',          // unit (Text)
      G: '0',          // quantity (Number)
      H: '0',          // purchasePrice (Number)
      I: '0',          // sellingPriceRJ (Number)
      J: '0',          // sellingPriceRI (Number)
      K: 'dd/mm/yyyy', // expiredDate
      L: '@'           // supplier (Text)
    };
    
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:L1');
    for(let C = range.s.c; C <= range.e.c; ++C) {
        const colLetter = XLSX.utils.encode_col(C);
        // Apply format to header to hint Excel, but more importantly to cells below
        for(let R = range.s.r + 1; R <= 100; ++R) { // Apply format for next 100 rows
            const cellRef = XLSX.utils.encode_cell({c: C, r: R});
            if (columnFormats[colLetter]) {
                if(!ws[cellRef]) ws[cellRef] = {t: 'z', v: undefined}; // Create empty cell if it doesn't exist
                ws[cellRef].z = columnFormats[colLetter];
            }
        }
    }
    
    // Set column widths for better visibility
    ws['!cols'] = [
        { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 10 },
        { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 25 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'inventory_template.xlsx');
  };

  const handleExportData = () => {
    const ws = XLSX.utils.json_to_sheet(inventory);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, 'inventory_export.xlsx');
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
              accept=".xlsx, .xls"
            />
             <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Excel
            </Button>
             <Button variant="outline" onClick={handleExportData}>
              <FileDown className="mr-2 h-4 w-4" />
              Export Excel
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
                                  captionLayout="dropdown-buttons"
                                  fromYear={1900}
                                  toYear={new Date().getFullYear() + 15}
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

    

    