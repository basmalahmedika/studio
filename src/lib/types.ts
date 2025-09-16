export type Transaction = {
  id: string;
  date: string;
  medicationName: string;
  quantity: number;
  type: 'IN' | 'OUT';
  patientType: 'Rawat Jalan' | 'Rawat Inap';
  paymentMethod: 'BPJS' | 'UMUM';
  context: string;
  totalPrice: number;
  medicalRecordNumber?: string;
};

export type Medication = {
  id: string;
  name: string;
  stock: number;
  price: number;
};

export type SalesData = {
  name: string;
  total: number;
};

export type InventoryItem = {
  id: string;
  inputDate: string;
  itemName: string;
  batchNumber: string;
  itemType: 'Alkes' | 'Obat';
  category: 'Oral' | 'Topikal' | 'Injeksi' | 'Suppositoria' | 'Inhalasi/Nasal' | 'Vaksin' | 'Lainnya';
  unit: 'Tablet' | 'Kapsul' | 'Vial' | 'Amp' | 'Pcs' | 'Cm' | 'Btl';
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  expiredDate: string;
  supplier: string;
};
