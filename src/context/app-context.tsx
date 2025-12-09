
'use client';

import * as React from 'react';
import type { FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  query,
  orderBy,
  runTransaction,
  getDocs,
  where,
  type Firestore,
  type DocumentReference,
} from 'firebase/firestore';
import { startOfMonth } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import type { InventoryItem, Transaction } from '@/lib/types';

type PatientTypeFilter = 'all' | 'Rawat Jalan' | 'Rawat Inap' | 'Lain-lain';
type PaymentMethodFilter = 'all' | 'UMUM' | 'BPJS' | 'Lain-lain';

interface AppFilters {
  date: DateRange | undefined;
  patientType: PatientTypeFilter;
  paymentMethod: PaymentMethodFilter;
}

interface AppContextType {
  inventory: InventoryItem[];
  transactions: Transaction[];
  loading: boolean;
  filters: AppFilters;
  setFilters: (filters: Partial<AppFilters>) => void;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<DocumentReference>;
  updateInventoryItem: (id: string, updatedItem: Partial<Omit<InventoryItem, 'id'>>) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  bulkAddInventoryItems: (items: Omit<InventoryItem, 'id'>[]) => Promise<void>;
  bulkDeleteInventoryItems: (ids: string[]) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, updatedTransactionData: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

const AppContext = React.createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: React.ReactNode;
  firebaseApp: FirebaseApp;
}

export function AppProvider({ children, firebaseApp }: AppProviderProps) {
  const [inventory, setInventory] = React.useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFiltersState] = React.useState<AppFilters>({
    date: {
      from: startOfMonth(new Date()),
      to: new Date(),
    },
    patientType: 'all',
    paymentMethod: 'all',
  });
  const dbInstanceRef = React.useRef<Firestore | null>(null);

  const setFilters = (newFilters: Partial<AppFilters>) => {
    setFiltersState(prev => ({...prev, ...newFilters}));
  };

  React.useEffect(() => {
    if (!firebaseApp) {
      setLoading(true);
      return;
    }

    async function fetchData() {
      try {
        const db = getFirestore(firebaseApp);
        dbInstanceRef.current = db;
        setLoading(true);

        const inventoryQuery = query(collection(db, 'inventory'), orderBy('itemName'));
        const transactionsQuery = query(collection(db, 'transactions'), orderBy('date', 'desc'));

        const [inventorySnapshot, transactionsSnapshot] = await Promise.all([
          getDocs(inventoryQuery),
          getDocs(transactionsQuery),
        ]);

        const inventoryData = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
        const transactionsData = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        
        setInventory(inventoryData);
        setTransactions(transactionsData);

      } catch (error) {
        console.error("Failed to initialize Firestore or fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();

  }, [firebaseApp]);

  const getDb = () => {
    if (!dbInstanceRef.current) {
      throw new Error("Firestore is not initialized yet.");
    }
    return dbInstanceRef.current;
  }

  // INVENTORY MANAGEMENT
  const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
    const db = getDb();
    const docRef = await addDoc(collection(db, 'inventory'), item);
    const newItem = { id: docRef.id, ...item } as InventoryItem;
    setInventory(prev => [...prev, newItem].sort((a, b) => a.itemName.localeCompare(b.itemName)));
    return docRef;
  };

  const updateInventoryItem = async (id: string, updatedItem: Partial<Omit<InventoryItem, 'id'>>) => {
    const db = getDb();
    const itemDoc = doc(db, 'inventory', id);
    await updateDoc(itemDoc, updatedItem);
    setInventory(prev => prev.map(item => item.id === id ? { ...item, ...updatedItem } : item).sort((a, b) => a.itemName.localeCompare(b.itemName)));
  };

  const deleteInventoryItem = async (id: string) => {
    const db = getDb();
    await deleteDoc(doc(db, 'inventory', id));
    setInventory(prev => prev.filter(item => item.id !== id));
  };

  const bulkAddInventoryItems = async (items: Omit<InventoryItem, 'id'>[]) => {
    const db = getDb();
    const inventoryCollectionRef = collection(db, 'inventory');
    const batch = writeBatch(db);

    setInventory(prevInventory => {
      const existingItemsMap = new Map<string, { id: string; quantity: number }>();
      prevInventory.forEach(item => {
        const key = `${item.itemName}_${item.batchNumber}`;
        existingItemsMap.set(key, { id: item.id, quantity: item.quantity });
      });

      const newDocsForState: InventoryItem[] = [];
      const updatedDocsForState: { [id: string]: Partial<InventoryItem> } = {};

      for (const item of items) {
        const key = `${item.itemName}_${item.batchNumber}`;
        const existingItem = existingItemsMap.get(key);

        if (existingItem) {
          const docRef = doc(db, 'inventory', existingItem.id);
          const newQuantity = (existingItem.quantity || 0) + item.quantity;
          const updatePayload = { ...item, quantity: newQuantity };
          batch.update(docRef, updatePayload);
          
          updatedDocsForState[existingItem.id] = updatePayload;
          existingItemsMap.set(key, { ...existingItem, quantity: newQuantity });
        } else {
          const newDocRef = doc(inventoryCollectionRef);
          batch.set(newDocRef, item);

          const newItemWithId = { id: newDocRef.id, ...item } as InventoryItem;
          newDocsForState.push(newItemWithId);
          existingItemsMap.set(key, { id: newDocRef.id, quantity: item.quantity });
        }
      }
      
      batch.commit().then(() => {
         console.log("Bulk inventory write committed to Firestore.");
      }).catch(err => {
         console.error("Failed to commit bulk inventory update:", err);
      });

      const updatedFromBatch = prevInventory.map(i => i.id in updatedDocsForState ? { ...i, ...updatedDocsForState[i.id] } : i);
      return [...updatedFromBatch, ...newDocsForState].sort((a, b) => a.itemName.localeCompare(b.itemName));
    });
  };
  
  const bulkDeleteInventoryItems = async (ids: string[]) => {
    const db = getDb();
    const batch = writeBatch(db);
    ids.forEach(id => {
      const docRef = doc(db, 'inventory', id);
      batch.delete(docRef);
    });
    await batch.commit();
    setInventory(prev => prev.filter(item => !ids.includes(item.id)));
  };

  // TRANSACTION MANAGEMENT & STOCK SYNCHRONIZATION
 const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    const db = getDb();
    
    const newDocRef = await runTransaction(db, async (t) => {
      const transactionItems = transaction.items || [];
       if (transactionItems.length === 0) {
        throw new Error("Transaksi harus memiliki setidaknya satu item.");
      }

      const itemRefs = transactionItems.map(item => doc(db, 'inventory', item.itemId));
      const itemDocs = await Promise.all(itemRefs.map(ref => t.get(ref)));

      const stockAdjustments: { ref: DocumentReference; newQuantity: number; itemName: string }[] = [];

      for (let i = 0; i < transactionItems.length; i++) {
        const soldItem = transactionItems[i];
        const itemDoc = itemDocs[i];

        if (!itemDoc.exists()) {
          throw new Error(`Item dengan ID "${soldItem.itemId}" tidak ada di inventaris!`);
        }
        
        const currentQuantity = itemDoc.data().quantity;
        if (currentQuantity < soldItem.quantity) {
          throw new Error(`Stok tidak mencukupi untuk "${itemDoc.data().itemName}". Tersedia: ${currentQuantity}, Dibutuhkan: ${soldItem.quantity}`);
        }
        
        const newQuantity = currentQuantity - soldItem.quantity;
        stockAdjustments.push({ ref: itemDoc.ref, newQuantity, itemName: itemDoc.data().itemName });
      }

      const newTransactionRef = doc(collection(db, "transactions"));
      t.set(newTransactionRef, transaction);
      
      for (const { ref, newQuantity } of stockAdjustments) {
        t.update(ref, { quantity: newQuantity });
      }

      return newTransactionRef;
    });

    const newTransaction = { id: newDocRef.id, ...transaction } as Transaction;
    setTransactions(prev => [newTransaction, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  
    setInventory(prevInventory => {
      const inventoryMap = new Map(prevInventory.map(item => [item.id, item]));
      (transaction.items || []).forEach(soldItem => {
        const existingItem = inventoryMap.get(soldItem.itemId);
        if (existingItem) {
          inventoryMap.set(soldItem.itemId, {
            ...existingItem,
            quantity: existingItem.quantity - soldItem.quantity
          });
        }
      });
      return Array.from(inventoryMap.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));
    });
  };


 const updateTransaction = async (id: string, updatedTransactionData: Omit<Transaction, 'id'>) => {
    const db = getDb();
    const transactionDocRef = doc(db, 'transactions', id);
    
    await runTransaction(db, async (t) => {
        const originalTransactionDoc = await t.get(transactionDocRef);
        if (!originalTransactionDoc.exists()) {
            throw new Error("Transaksi tidak ditemukan.");
        }
        const originalTransaction = originalTransactionDoc.data() as Transaction;
        
        const allItemIds = new Set([
            ...(originalTransaction.items || []).map(item => item.itemId),
            ...(updatedTransactionData.items || []).map(item => item.itemId),
        ]);
        
        const itemRefs = Array.from(allItemIds).map(itemId => doc(db, 'inventory', itemId));
        const itemDocs = await Promise.all(itemRefs.map(ref => t.get(ref)));
        const inventoryDataMap: Map<string, { name: string, currentStock: number }> = new Map();
        
        itemDocs.forEach((itemDoc) => {
            if (itemDoc.exists()) {
                const data = itemDoc.data();
                inventoryDataMap.set(itemDoc.id, { name: data.itemName, currentStock: data.quantity });
            }
        });

        const stockChanges: Map<string, number> = new Map();
        (originalTransaction.items || []).forEach(item => {
            stockChanges.set(item.itemId, (stockChanges.get(item.itemId) || 0) + item.quantity);
        });
        (updatedTransactionData.items || []).forEach(item => {
            stockChanges.set(item.itemId, (stockChanges.get(item.itemId) || 0) - item.quantity);
        });
        
        for (const [itemId, netChange] of stockChanges.entries()) {
            if (netChange === 0) continue;
            
            const invData = inventoryDataMap.get(itemId);
             if (!invData) {
                throw new Error(`Data inventaris untuk item ID ${itemId} tidak dapat ditemukan untuk validasi stok.`);
            }
            const finalStock = invData.currentStock + netChange;

            if (finalStock < 0) {
                throw new Error(`Stok tidak mencukupi untuk item "${invData.name}". Stok saat ini: ${invData.currentStock}, dibutuhkan perubahan bersih: ${-netChange}.`);
            }
        }

        for (const [itemId, netChange] of stockChanges.entries()) {
            if (netChange === 0) continue;

            const currentStock = inventoryDataMap.get(itemId)!.currentStock;
            const itemDocRef = doc(db, 'inventory', itemId);
            t.update(itemDocRef, { quantity: currentStock + netChange });
        }
        
        t.update(transactionDocRef, updatedTransactionData);
    });

    setTransactions(prev => prev.map(tr => tr.id === id ? { id, ...updatedTransactionData } as Transaction : tr).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

    setInventory(prevInventory => {
      const inventoryMap = new Map(prevInventory.map(item => [item.id, { ...item }]));
      const originalTransaction = transactions.find(t => t.id === id);

      if (originalTransaction) {
        (originalTransaction.items || []).forEach(item => {
          const invItem = inventoryMap.get(item.itemId);
          if (invItem) invItem.quantity += item.quantity;
        });
      }

      (updatedTransactionData.items || []).forEach(item => {
          const invItem = inventoryMap.get(item.itemId);
          if (invItem) invItem.quantity -= item.quantity;
      });

      return Array.from(inventoryMap.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));
    });
};

 const deleteTransaction = async (id: string) => {
     const db = getDb();
     const transactionDocRef = doc(db, 'transactions', id);

     const transactionToDelete = transactions.find(t => t.id === id);
     if (!transactionToDelete) {
        throw new Error("Transaksi untuk dihapus tidak ditemukan di state lokal.");
     }
     
     await runTransaction(db, async (t) => {
        const transactionDoc = await t.get(transactionDocRef);
        if (!transactionDoc.exists()) {
            console.warn(`Transaction ${id} not found on server, deleting locally.`);
            return; 
        }

        const itemsToRestore = (transactionDoc.data() as Transaction).items || [];
        
        const itemRefs = itemsToRestore.map(item => doc(db, 'inventory', item.itemId));
        const itemDocs = await Promise.all(itemRefs.map(ref => t.get(ref)));

        itemDocs.forEach((itemDoc, index) => {
             if (itemDoc.exists()) {
                const currentQuantity = itemDoc.data().quantity || 0;
                const newQuantity = currentQuantity + itemsToRestore[index].quantity;
                t.update(itemDoc.ref, { quantity: newQuantity });
            }
        });
        
        t.delete(transactionDocRef);
    });

    setTransactions(prev => prev.filter(tr => tr.id !== id));
    
    setInventory(prevInventory => {
      const inventoryMap = new Map(prevInventory.map(item => [item.id, { ...item }]));
      (transactionToDelete.items || []).forEach(itemToRestore => {
        const invItem = inventoryMap.get(itemToRestore.itemId);
        if (invItem) {
          invItem.quantity += itemToRestore.quantity;
        }
      });
      return Array.from(inventoryMap.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));
    });
  };

  const value = {
    inventory,
    transactions,
    loading,
    filters,
    setFilters,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    bulkAddInventoryItems,
    bulkDeleteInventoryItems,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = React.useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

    