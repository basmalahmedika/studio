import type { Medication, Transaction, InventoryItem } from '@/lib/types';

export const medications: Medication[] = [
  { id: 'med001', name: 'Paracetamol 500mg', stock: 250, price: 5000 },
  { id: 'med002', name: 'Amoxicillin 250mg', stock: 150, price: 12000 },
  { id: 'med003', name: 'Vitamin C 1000mg', stock: 500, price: 25000 },
  { id: 'med004', name: 'Aspirin 80mg', stock: 120, price: 8000 },
  { id: 'med005', name: 'Loratadine 10mg', stock: 80, price: 15000 },
  { id: 'med006', name: 'Omeprazole 20mg', stock: 95, price: 18000 },
  { id: 'med007', name: 'Salbutamol Inhaler', stock: 40, price: 75000 },
  { id: 'med008', name: 'Metformin 500mg', stock: 180, price: 9000 },
  { id: 'med009', name: 'Antacid Syrup', stock: 70, price: 22000 },
  { id: 'med010', name: 'Cough Syrup 100ml', stock: 110, price: 17000 },
];

const randomDate = (start: Date, end: Date): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const generateTransactions = (): Transaction[] => {
  const transactions: Transaction[] = [];
  const medicationNames = medications.map(m => m.name);
  const patientTypes: ('Rawat Jalan' | 'Rawat Inap')[] = ['Rawat Jalan', 'Rawat Inap'];
  const paymentMethods: ('BPJS' | 'UMUM')[] = ['BPJS', 'UMUM'];
  const startDate = new Date(2023, 0, 1);
  const endDate = new Date();

  for (let i = 0; i < 150; i++) {
    const med = medications[Math.floor(Math.random() * medications.length)];
    const quantity = Math.floor(Math.random() * 5) + 1;
    transactions.push({
      id: `trx${String(i + 1).padStart(3, '0')}`,
      date: randomDate(startDate, endDate).toISOString().split('T')[0],
      medicationName: med.name,
      quantity,
      type: 'OUT',
      patientType: patientTypes[Math.floor(Math.random() * patientTypes.length)],
      paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      context: 'Resep dokter',
      totalPrice: med.price * quantity,
    });
  }
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const transactions: Transaction[] = generateTransactions();


export const inventory: InventoryItem[] = [
  {
    id: 'inv001',
    inputDate: '2024-05-01',
    itemName: 'Paracetamol 500mg',
    itemType: 'Obat',
    category: 'Oral',
    unit: 'Tablet',
    quantity: 1000,
    purchasePrice: 4000,
    sellingPrice: 5000,
    expiredDate: '2026-05-01',
    supplier: 'Supplier A',
  },
  {
    id: 'inv002',
    inputDate: '2024-05-02',
    itemName: 'Amoxicillin 250mg',
    itemType: 'Obat',
    category: 'Oral',
    unit: 'Kapsul',
    quantity: 500,
    purchasePrice: 10000,
    sellingPrice: 12000,
    expiredDate: '2025-11-01',
    supplier: 'Supplier B',
  },
  {
    id: 'inv003',
    inputDate: '2024-05-03',
    itemName: 'Perban Steril 10cm',
    itemType: 'Alkes',
    category: 'Lainnya',
    unit: 'Pcs',
    quantity: 200,
    purchasePrice: 2000,
    sellingPrice: 3000,
    expiredDate: '2027-01-01',
    supplier: 'Supplier C',
  },
  {
    id: 'inv004',
    inputDate: '2024-05-04',
    itemName: 'Insulin Pen',
    itemType: 'Obat',
    category: 'Injeksi',
    unit: 'Pcs',
    quantity: 50,
    purchasePrice: 150000,
    sellingPrice: 175000,
    expiredDate: '2025-08-01',
    supplier: 'Supplier A',
  },
];
