
'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, MoreHorizontal, Pen, Trash2, Upload, Download, FileDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppContext } from '@/context/app-context';
import type { InventoryItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';


const inventorySchema = z.object({
  id: z.string().optional(),
  inputDate: z.date({
    required_error: "Tanggal input harus diisi.",
  }),
  itemName: z.string().min(1, 'Nama item harus diisi'),
  batchNumber: z.string().min(1, 'Nomor batch harus diisi'),
  itemType: z.enum(['Alkes', 'Obat']),
  category: z.enum(['Oral', 'Topikal', 'Injeksi', 'Suppositoria', 'Inhalasi/Nasal', 'Vaksin', 'Lainnya']),
  unit: z.enum(['Tablet', 'Kapsul', 'Vial', 'Amp', 'Pcs', 'Cm', 'Btl']),
  quantity: z.coerce.number().min(0, 'Kuantitas harus angka positif'),
  purchasePrice: z.coerce.number().min(0, 'Harga beli harus angka positif'),
  sellingPriceRJ: z.coerce.number().min(0, 'Harga jual harus diisi'),
  sellingPriceRI: z.coerce.number().min(0, 'Harga jual harus diisi'),
  expiredDate: z.date({
    required_error: "Tanggal kadaluarsa harus diisi.",
  }),
  supplier: z.string().min(1, 'Pemasok harus diisi'),
});

type InventoryFormValues = z.infer<typeof inventorySchema>;

// A more robust schema for Excel import that coerces types
const excelRowSchema = z.object({
  inputDate: z.any().refine(val => val, { message: "inputDate harus diisi" }),
  itemName: z.string({ required_error: "itemName harus diisi" }).min(1, "itemName harus diisi"),
  batchNumber: z.any().refine(val => val !== null && val !== undefined, { message: "batchNumber harus diisi" }).transform(val => String(val)),
  itemType: z.enum(['Alkes', 'Obat'], { errorMap: () => ({ message: "itemType harus 'Alkes' atau 'Obat'" }) }),
  category: z.enum(['Oral', 'Topikal', 'Injeksi', 'Suppositoria', 'Inhalasi/Nasal', 'Vaksin', 'Lainnya'], { errorMap: () => ({ message: "Nilai kategori tidak valid" }) }),
  unit: z.enum(['Tablet', 'Kapsul', 'Vial', 'Amp', 'Pcs', 'Cm', 'Btl'], { errorMap: () => ({ message: "Nilai unit tidak valid" }) }),
  quantity: z.any().pipe(z.coerce.number({ invalid_type_error: "kuantitas harus berupa angka" }).min(0, "kuantitas tidak boleh negatif")),
  purchasePrice: z.any().pipe(z.coerce.number({ invalid_type_error: "hargaBeli harus berupa angka" }).min(0, "hargaBeli tidak boleh negatif")),
  sellingPriceRJ: z.any().pipe(z.coerce.number({ invalid_type_error: "hargaJualRJ harus berupa angka" }).min(0, "hargaJualRJ tidak boleh negatif")),
  sellingPriceRI: z.any().pipe(z.coerce.number({ invalid_type_error: "hargaJualRI harus berupa angka" }).min(0, "hargaJualRI tidak boleh negatif")),
  expiredDate: z.any().refine(val => val, { message: "expiredDate harus diisi" }),
  supplier: z.string({ required_error: "supplier harus diisi" }).min(1, "supplier harus diisi"),
});


const excelSerialDateToJSDate = (serial: number): Date => {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  const offset = date_info.getTimezoneOffset();
  date_info.setMinutes(date_info.getMinutes() + offset);
  return date_info;
};

const parseDateFromExcel = (dateValue: any): Date | null => {
  if (dateValue === null || typeof dateValue === 'undefined' || dateValue === '') return null;

  // Handle JS Date objects
  if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
    return dateValue;
  }
  
  // Handle Excel serial numbers
  if (typeof dateValue === 'number') {
    return excelSerialDateToJSDate(dateValue);
  }
  
  // Handle string dates (e.g., "dd/mm/yyyy", "mm/dd/yyyy", "yyyy-mm-dd")
  if (typeof dateValue === 'string') {
    // Attempt to parse various formats
    const formats = [
      /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/, // dd/mm/yyyy or mm/dd/yyyy
      /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/, // yyyy/mm/dd
    ];
    for (const regex of formats) {
        const parts = dateValue.match(regex);
        if (parts) {
            let year, month, day;
            if(regex.source.startsWith('(\\d{4})')) { // yyyy-mm-dd
                year = parseInt(parts[1], 10);
                month = parseInt(parts[2], 10) - 1;
                day = parseInt(parts[3], 10);
            } else { // dd-mm-yyyy or mm-dd-yyyy (assume dd/mm for robustness)
                day = parseInt(parts[1], 10);
                month = parseInt(parts[2], 10) - 1;
                year = parseInt(parts[3], 10);
            }
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                const date = new Date(Date.UTC(year, month, day));
                 if (date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day) {
                    return date;
                }
            }
        }
    }
  }

  // Fallback to direct parsing
  const parsedDate = new Date(dateValue);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate;
  }
  
  return null;
};


export function InventoryDataTable() {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, bulkAddInventoryItems, bulkDeleteInventoryItems } = useAppContext();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [selectedRows, setSelectedRows] = React.useState<string[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
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
        toast({ title: "Sukses", description: "Item telah diperbarui." });
      } else {
        const { id, ...createData } = formattedValues;
        await addInventoryItem(createData);
        toast({ title: "Sukses", description: "Item baru telah ditambahkan." });
      }
      form.reset();
      setIsEditDialogOpen(false);
    } catch(error) {
       console.error("Error submitting form:", error);
       toast({ variant: "destructive", title: "Error", description: "Terjadi kesalahan saat menyimpan item." });
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
        toast({ title: "Sukses", description: "Item telah dihapus." });
    } catch(error) {
        toast({ variant: "destructive", title: "Error", description: "Gagal menghapus item." });
    }
  }
  
  const handleBulkDelete = async () => {
    try {
      await bulkDeleteInventoryItems(selectedRows);
      toast({ title: 'Sukses', description: `${selectedRows.length} item telah dihapus.` });
      setSelectedRows([]);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Gagal menghapus item yang dipilih.' });
    }
  };

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
          const json = XLSX.utils.sheet_to_json(worksheet, { defval: null, header: 1 });
          
          if(json.length < 2) {
             throw new Error("File Excel kosong atau hanya berisi header.");
          }

          const headers = json[0] as string[];
          const rows = json.slice(1);

          const newItems = [];
          for (let i = 0; i < rows.length; i++) {
            const rowData = rows[i] as any[];
            const rowIndex = i + 2; // Excel rows are 1-based, plus header

            const rowObject = headers.reduce((obj, header, index) => {
                obj[header] = rowData[index];
                return obj;
            }, {} as {[key: string]: any});


            const validationResult = excelRowSchema.safeParse(rowObject);

            if (!validationResult.success) {
              const firstError = validationResult.error.issues[0];
              const columnName = firstError.path.join('.');
              throw new Error(`Error pada baris ${rowIndex}: Untuk kolom '${columnName}', ${firstError.message}`);
            }
            
            const { data: validatedData } = validationResult;
            
            const inputDate = parseDateFromExcel(validatedData.inputDate);
            const expiredDate = parseDateFromExcel(validatedData.expiredDate);

            if (!inputDate) {
              throw new Error(`Error pada baris ${rowIndex}: inputDate tidak valid atau kosong. Harap gunakan format dd/mm/yyyy.`);
            }
            if (!expiredDate) {
              throw new Error(`Error pada baris ${rowIndex}: expiredDate tidak valid atau kosong. Harap gunakan format dd/mm/yyyy.`);
            }

            newItems.push({
              ...validatedData,
              inputDate: format(inputDate, "yyyy-MM-dd"),
              expiredDate: format(expiredDate, "yyyy-MM-dd"),
            });
          }

          if (newItems.length > 0) {
            await bulkAddInventoryItems(newItems);
            toast({ title: "Unggah Berhasil", description: `${newItems.length} item baru telah ditambahkan.` });
          } else {
            toast({ variant: "destructive", title: "Info Unggahan", description: "Tidak ada item baru yang ditemukan di file untuk diunggah." });
          }

        } catch (error: any) {
           console.error("File processing error:", error);
           toast({ variant: "destructive", title: "Unggah Gagal", description: error.message || "Terjadi kesalahan tak terduga saat memproses file.", duration: 10000 });
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
    
    // Set column widths for better visibility
    ws['!cols'] = [
        { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 10 },
        { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 25 }
    ];

    // Apply formats to the columns for future rows
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:L1');
    for(let C = range.s.c; C <= range.e.c; ++C) {
        const colLetter = XLSX.utils.encode_col(C);
        if (columnFormats[colLetter]) {
             // This is a bit of a hack for XLSX.js to apply format to a whole column
            for(let R = range.s.r + 1; R <= 1000; ++R) { // Apply for the next 1000 rows
                const cellRef = XLSX.utils.encode_cell({c: C, r: R});
                if(!ws[cellRef]) ws[cellRef] = {t: 'z', v: undefined}; // Create empty cell if it doesn't exist
                 ws[cellRef].z = columnFormats[colLetter];
            }
        }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'template_inventaris.xlsx');
  };

  const handleExportData = () => {
    const ws = XLSX.utils.json_to_sheet(inventory);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventaris');
    XLSX.writeFile(wb, 'ekspor_inventaris.xlsx');
  };
  
  const filteredInventory = React.useMemo(() => {
    return inventory.filter(item =>
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventory, searchTerm]);

  // Pagination Logic
  const totalItems = filteredInventory.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedData = filteredInventory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(paginatedData.map(item => item.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleRowSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRows(prev => [...prev, id]);
    } else {
      setSelectedRows(prev => prev.filter(rowId => rowId !== id));
    }
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };
  
  const isAllOnPageSelected = paginatedData.length > 0 && selectedRows.length === paginatedData.length && paginatedData.every(item => selectedRows.includes(item.id));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle>Daftar Inventaris</CardTitle>
          <div className="flex flex-wrap gap-2 items-center">
             {selectedRows.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Hapus Pilihan ({selectedRows.length})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Apakah Anda benar-benar yakin?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tindakan ini tidak dapat dibatalkan. Ini akan menghapus {selectedRows.length} item secara permanen dari inventaris Anda.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">
                      Hapus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".xlsx, .xls"
            />
             <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Unduh Template
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Unggah Excel
            </Button>
             <Button variant="outline" onClick={handleExportData}>
              <FileDown className="mr-2 h-4 w-4" />
              Ekspor Excel
            </Button>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenAddNew}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Tambah Item Baru
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{form.getValues('id') ? 'Ubah Item' : 'Tambah Item Baru'}</DialogTitle>
                  <DialogDescription>
                    Isi formulir di bawah ini untuk menambahkan item baru ke inventaris.
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
                            <FormLabel>Nama Item</FormLabel>
                            <FormControl>
                              <Input placeholder="cth., Paracetamol 500mg" {...field} />
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
                              <Input placeholder="cth., B12345" {...field} />
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
                            <FormLabel>Tanggal Input</FormLabel>
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
                                      <span>Pilih tanggal</span>
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
                            <FormLabel>Tipe Item</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih tipe item" />
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
                            <FormLabel>Kategori</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih kategori" />
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
                                  <SelectValue placeholder="Pilih unit" />
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
                            <FormLabel>Kuantitas</FormLabel>
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
                            <FormLabel>Harga Beli</FormLabel>
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
                            <FormLabel>Harga Jual (RJ)</FormLabel>
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
                            <FormLabel>Harga Jual (RI)</FormLabel>
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
                            <FormLabel>Tanggal Kadaluarsa</FormLabel>
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
                                      <span>Pilih tanggal</span>
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
                            <FormLabel>Pemasok</FormLabel>
                            <FormControl>
                              <Input placeholder="cth., Pemasok A" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                          <Button type="button" variant="secondary">Batal</Button>
                      </DialogClose>
                      <Button type="submit">Simpan Perubahan</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari item..."
              className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                 <TableHead className="w-[40px]">
                  <Checkbox
                    checked={isAllOnPageSelected}
                    onCheckedChange={(value) => handleSelectAll(!!value)}
                    aria-label="Pilih semua"
                  />
                </TableHead>
                <TableHead>Nama Item</TableHead>
                <TableHead>No. Batch</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Jml</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Harga Beli</TableHead>
                <TableHead>Harga Jual (RJ)</TableHead>
                <TableHead>Harga Jual (RI)</TableHead>
                <TableHead>Kadaluarsa</TableHead>
                <TableHead>Pemasok</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item) => (
                <TableRow key={item.id} data-state={selectedRows.includes(item.id) && "selected"}>
                   <TableCell>
                    <Checkbox
                      checked={selectedRows.includes(item.id)}
                      onCheckedChange={(value) => handleRowSelect(item.id, !!value)}
                      aria-label="Pilih baris"
                    />
                  </TableCell>
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
                          <span className="sr-only">Buka menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(item)}>
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
                                Tindakan ini tidak bisa dibatalkan. Ini akan menghapus item secara permanen
                                dari inventaris Anda.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive hover:bg-destructive/90">
                                Hapus
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
       <CardFooter>
        <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
          <div className="flex-1">
            Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} sampai {Math.min(currentPage * itemsPerPage, totalItems)} dari {totalItems} item.
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
