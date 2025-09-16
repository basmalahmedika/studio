import type { Transaction, InventoryItem } from '@/lib/types';

export const initialInventory: InventoryItem[] = [
  {
    id: 'inv001',
    inputDate: '2024-05-01',
    itemName: 'Paracetamol 500mg',
    batchNumber: 'P001',
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
    batchNumber: 'A001',
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
    batchNumber: 'PS001',
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
    batchNumber: 'I001',
    itemType: 'Obat',
    category: 'Injeksi',
    unit: 'Pcs',
    quantity: 50,
    purchasePrice: 150000,
    sellingPrice: 175000,
    expiredDate: '2025-08-01',
    supplier: 'Supplier A',
  },
    {
    id: 'inv005',
    inputDate: '2024-01-10',
    itemName: 'Vitamin C 1000mg',
    batchNumber: 'VC001',
    itemType: 'Obat',
    category: 'Oral',
    unit: 'Tablet',
    quantity: 800,
    purchasePrice: 2000,
    sellingPrice: 2500,
    expiredDate: '2025-01-10',
    supplier: 'Supplier B',
  },
  {
    id: 'inv006',
    inputDate: '2024-02-15',
    itemName: 'Aspirin 80mg',
    batchNumber: 'AS001',
    itemType: 'Obat',
    category: 'Oral',
    unit: 'Tablet',
    quantity: 300,
    purchasePrice: 700,
    sellingPrice: 1000,
    expiredDate: '2026-02-15',
    supplier: 'Supplier C',
  },
  {
    id: 'inv007',
    inputDate: '2024-03-20',
    itemName: 'Loratadine 10mg',
    batchNumber: 'LO001',
    itemType: 'Obat',
    category: 'Oral',
    unit: 'Tablet',
    quantity: 150,
    purchasePrice: 1200,
    sellingPrice: 1500,
    expiredDate: '2025-09-20',
    supplier: 'Supplier A',
  },
  {
    id: 'inv008',
    inputDate: '2024-04-05',
    itemName: 'Omeprazole 20mg',
    batchNumber: 'OM001',
    itemType: 'Obat',
    category: 'Oral',
    unit: 'Kapsul',
    quantity: 250,
    purchasePrice: 1500,
    sellingPrice: 2000,
    expiredDate: '2026-04-05',
    supplier: 'Supplier B',
  },
  {
    id: 'inv009',
    inputDate: '2024-04-10',
    itemName: 'Salbutamol Inhaler',
    batchNumber: 'SA001',
    itemType: 'Obat',
    category: 'Inhalasi/Nasal',
    unit: 'Pcs',
    quantity: 80,
    purchasePrice: 60000,
    sellingPrice: 75000,
    expiredDate: '2025-10-10',
    supplier: 'Supplier C',
  },
  {
    id: 'inv010',
    inputDate: '2024-05-15',
    itemName: 'Metformin 500mg',
    batchNumber: 'ME001',
    itemType: 'Obat',
    category: 'Oral',
    unit: 'Tablet',
    quantity: 400,
    purchasePrice: 800,
    sellingPrice: 1200,
    expiredDate: '2026-05-15',
    supplier: 'Supplier A',
  },
  {
    id: 'inv011',
    inputDate: '2024-05-20',
    itemName: 'Antacid Syrup',
    batchNumber: 'AN001',
    itemType: 'Obat',
    category: 'Oral',
    unit: 'Btl',
    quantity: 120,
    purchasePrice: 18000,
    sellingPrice: 22000,
    expiredDate: '2025-11-20',
    supplier: 'Supplier B',
  },
  {
    id: 'inv012',
    inputDate: '2024-06-01',
    itemName: 'Cough Syrup 100ml',
    batchNumber: 'CO001',
    itemType: 'Obat',
    category: 'Oral',
    unit: 'Btl',
    quantity: 180,
    purchasePrice: 15000,
    sellingPrice: 18000,
    expiredDate: '2026-06-01',
    supplier: 'Supplier C',
  },
  {
    id: 'inv013',
    inputDate: '2024-06-05',
    itemName: 'Termometer Digital',
    batchNumber: 'TD001',
    itemType: 'Alkes',
    category: 'Lainnya',
    unit: 'Pcs',
    quantity: 90,
    purchasePrice: 25000,
    sellingPrice: 35000,
    expiredDate: '2029-06-05',
    supplier: 'Supplier A',
  },
  {
    id: 'inv014',
    inputDate: '2024-06-10',
    itemName: 'Tensimeter Digital',
    batchNumber: 'TS001',
    itemType: 'Alkes',
    category: 'Lainnya',
    unit: 'Pcs',
    quantity: 40,
    purchasePrice: 250000,
    sellingPrice: 300000,
    expiredDate: '2030-06-10',
    supplier: 'Supplier B',
  },
];

const generateTransactions = (inventory: InventoryItem[]): Transaction[] => {
  const transactions: Transaction[] = [];
  const patientTypes: ('Rawat Jalan' | 'Rawat Inap')[] = ['Rawat Jalan', 'Rawat Inap'];
  const paymentMethods: ('BPJS' | 'UMUM')[] = ['BPJS', 'UMUM'];
  
  const sampleDates = [
    '2024-07-20', '2024-07-19', '2024-07-18', '2024-07-15', '2024-07-12', 
    '2024-06-28', '2024-06-25', '2024-06-22', '2024-06-18', '2024-06-15',
    '2024-05-30', '2024-05-27', '2024-05-21', '2024-05-15', '2024-05-10'
  ];

  let tempInventory = JSON.parse(JSON.stringify(inventory));

  for (let i = 0; i < 150; i++) {
    const itemIndex = i % tempInventory.length;
    const item = tempInventory[itemIndex];
    if (item.quantity <= 0) continue;

    const quantity = Math.min(item.quantity, (i % 5) + 1);
    const paymentMethod = paymentMethods[i % paymentMethods.length];
    const price = paymentMethod === 'BPJS' ? item.purchasePrice : item.sellingPrice;
    
    const medicalRecordNumber = `MR${String(100 + i).padStart(3, '0')}`;
    
    transactions.push({
      id: `trx${String(i + 1).padStart(3, '0')}`,
      date: sampleDates[i % sampleDates.length],
      medicationName: `${item.itemName} (x${quantity})`,
      quantity,
      type: 'OUT',
      patientType: patientTypes[i % patientTypes.length],
      paymentMethod,
      context: 'Resep dokter',
      totalPrice: price * quantity,
      medicalRecordNumber: medicalRecordNumber,
      items: [{
        itemId: item.id,
        quantity: quantity,
        price: price,
      }]
    });
    // Decrease stock in temporary inventory
    tempInventory[itemIndex].quantity -= quantity;
  }
  
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};


const tempInventoryCopy = JSON.parse(JSON.stringify(initialInventory));
export const initialTransactions: Transaction[] = generateTransactions(tempInventoryCopy);

// Calculate final stock after transactions
const finalInventory = JSON.parse(JSON.stringify(initialInventory));
initialTransactions.forEach(transaction => {
    if (transaction.items) {
        transaction.items.forEach(item => {
            const inventoryItem = finalInventory.find(inv => inv.id === item.itemId);
            if (inventoryItem) {
                inventoryItem.quantity -= item.quantity;
            }
        });
    }
});
export const inventory: InventoryItem[] = finalInventory;
export const transactions: Transaction[] = initialTransactions;
