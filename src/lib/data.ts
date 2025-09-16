import type { Transaction, InventoryItem } from '@/lib/types';

export const initialInventory: InventoryItem[] = [];

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
    if (tempInventory.length === 0) break;
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
