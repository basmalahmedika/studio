
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
} from 'firebase/firestore';
import type { InventoryItem, Transaction } from '@/lib/types';

interface AppContextType {
  inventory: InventoryItem[];
  transactions: Transaction[];
  loading: boolean;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<DocumentReference>;
  updateInventoryItem: (id: string, updatedItem: Partial<Omit<InventoryItem, 'id'>>) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  bulkAddInventoryItems: (items: Omit<InventoryItem, 'id'>[]) => Promise<void>;
  bulkDeleteInventoryItems: (ids: string[]) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<DocumentReference>;
  updateTransaction: (id: string, updatedTransactionData: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string, transactionToDelete: Transaction) => Promise<void>;
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
  const dbInstanceRef = React.useRef<Firestore | null>(null);

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
    const batch = writeBatch(db);
    const inventoryCollectionRef = collection(db, 'inventory');
    
    const inventorySnapshot = await getDocs(inventoryCollectionRef);
    const existingItemsMap = new Map<string, { id: string; quantity: number }>();
    inventorySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const key = `${data.itemName}_${data.batchNumber}`;
      existingItemsMap.set(key, { id: doc.id, quantity: data.quantity });
    });

    const newDocs: InventoryItem[] = [];
    const updatedDocs: {[id: string]: Partial<InventoryItem>} = {};

    for (const item of items) {
      const key = `${item.itemName}_${item.batchNumber}`;
      const existingItem = existingItemsMap.get(key);

      if (existingItem) {
        const docRef = doc(db, 'inventory', existingItem.id);
        const newQuantity = (existingItem.quantity || 0) + item.quantity;
        const updatePayload = { ...item, quantity: newQuantity };
        batch.update(docRef, updatePayload);
        updatedDocs[existingItem.id] = updatePayload;
        existingItemsMap.set(key, { ...existingItem, quantity: newQuantity });
      } else {
        const newDocRef = doc(inventoryCollectionRef);
        batch.set(newDocRef, item);
        const newItemWithId = { id: newDocRef.id, ...item } as InventoryItem;
        newDocs.push(newItemWithId);
        existingItemsMap.set(key, { id: newDocRef.id, quantity: item.quantity });
      }
    }
    
    await batch.commit();

    setInventory(prev => {
        const updated = prev.map(i => i.id in updatedDocs ? { ...i, ...updatedDocs[i.id] } : i);
        return [...updated, ...newDocs].sort((a, b) => a.itemName.localeCompare(b.itemName));
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
    const newTransactionRef = doc(collection(db, "transactions"));
    
    await runTransaction(db, async (t) => {
      const transactionItems = transaction.items || [];
      if (transactionItems.length === 0) {
        throw new Error("Transaksi harus memiliki setidaknya satu item.");
      }

      for (const soldItem of transactionItems) {
        const itemRef = doc(db, 'inventory', soldItem.itemId);
        const itemDoc = await t.get(itemRef);

        if (!itemDoc.exists()) {
          throw new Error(`Item dengan id ${soldItem.itemId} tidak ada!`);
        }
        
        const currentQuantity = itemDoc.data().quantity;
        if (currentQuantity < soldItem.quantity) {
          throw new Error(`Stok tidak mencukupi untuk item ${itemDoc.data().itemName}. Tersedia: ${currentQuantity}, Dibutuhkan: ${soldItem.quantity}`);
        }
        
        const newQuantity = currentQuantity - soldItem.quantity;
        t.update(itemRef, { quantity: newQuantity });
      }
      
      t.set(newTransactionRef, transaction);
    });

    const newTransaction = { id: newTransactionRef.id, ...transaction } as Transaction;
    setTransactions(prev => [newTransaction, ...prev]);

    setInventory(prevInventory => {
      const newInventory = [...prevInventory];
      (transaction.items || []).forEach(soldItem => {
        const itemIndex = newInventory.findIndex(invItem => invItem.id === soldItem.itemId);
        if (itemIndex > -1) {
          newInventory[itemIndex] = {
            ...newInventory[itemIndex],
            quantity: newInventory[itemIndex].quantity - soldItem.quantity
          };
        }
      });
      return newInventory;
    });
    
    return newTransactionRef;
  };

 const updateTransaction = async (id: string, updatedTransactionData: Omit<Transaction, 'id'>) => {
    const db = getDb();
    await runTransaction(db, async (t) => {
        const transactionDocRef = doc(db, 'transactions', id);
        const originalTransactionDoc = await t.get(transactionDocRef);

        if (!originalTransactionDoc.exists()) {
            throw new Error("Transaksi tidak ditemukan.");
        }
        
        const originalTransaction = originalTransactionDoc.data() as Transaction;
        const stockAdjustments = new Map<string, number>();

        (originalTransaction.items || []).forEach(item => {
            stockAdjustments.set(item.itemId, (stockAdjustments.get(item.itemId) || 0) + item.quantity);
        });

        (updatedTransactionData.items || []).forEach(item => {
            stockAdjustments.set(item.itemId, (stockAdjustments.get(item.itemId) || 0) - item.quantity);
        });

        for (const [itemId, adjustment] of stockAdjustments.entries()) {
             if (adjustment === 0) continue; 

             const itemDocRef = doc(db, 'inventory', itemId);
             const itemDoc = await t.get(itemDocRef);

             if (!itemDoc.exists()) {
                 throw new Error(`Item inventaris dengan ID ${itemId} tidak ditemukan.`);
             }

             const currentQuantity = itemDoc.data()?.quantity || 0;
             const newQuantity = currentQuantity + adjustment;

             if (newQuantity < 0) {
                 throw new Error(`Stok tidak mencukupi untuk item ${itemDoc.data()?.itemName}.`);
             }
             
             t.update(itemDocRef, { quantity: newQuantity });
        }
        
        t.update(transactionDocRef, updatedTransactionData);
    });

    setTransactions(prev => prev.map(tr => tr.id === id ? { id, ...updatedTransactionData } as Transaction : tr).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

    // Manually update inventory state after transaction update
    const stockAdjustments = new Map<string, number>();
    const originalTransaction = transactions.find(t => t.id === id);
    if(originalTransaction) {
        (originalTransaction.items || []).forEach(item => {
            stockAdjustments.set(item.itemId, (stockAdjustments.get(item.itemId) || 0) + item.quantity);
        });
    }
    (updatedTransactionData.items || []).forEach(item => {
        stockAdjustments.set(item.itemId, (stockAdjustments.get(item.itemId) || 0) - item.quantity);
    });

    setInventory(prevInventory => {
      let newInventory = [...prevInventory];
      for (const [itemId, adjustment] of stockAdjustments.entries()) {
        const itemIndex = newInventory.findIndex(invItem => invItem.id === itemId);
        if(itemIndex > -1) {
            newInventory[itemIndex] = {
                ...newInventory[itemIndex],
                quantity: newInventory[itemIndex].quantity + adjustment,
            }
        }
      }
      return newInventory;
    });

};

 const deleteTransaction = async (id: string, transactionToDelete: Transaction) => {
     const db = getDb();
     await runTransaction(db, async (t) => {
        const itemsToRestore = transactionToDelete.items || [];
        if (itemsToRestore.length > 0) {
            for (const itemToRestore of itemsToRestore) {
              const itemRef = doc(db, 'inventory', itemToRestore.itemId);
              const itemDoc = await t.get(itemRef);
              
              if (itemDoc.exists()) {
                  const currentQuantity = itemDoc.data().quantity || 0;
                  const newQuantity = currentQuantity + itemToRestore.quantity;
                  t.update(itemRef, { quantity: newQuantity });
              }
            }
        }
        const transactionDocRef = doc(db, 'transactions', id);
        t.delete(transactionDocRef);
    });

    setTransactions(prev => prev.filter(tr => tr.id !== id));
    setInventory(prevInventory => {
      const newInventory = [...prevInventory];
      (transactionToDelete.items || []).forEach(itemToRestore => {
        const itemIndex = newInventory.findIndex(invItem => invItem.id === itemToRestore.itemId);
        if (itemIndex > -1) {
          newInventory[itemIndex] = {
            ...newInventory[itemIndex],
            quantity: newInventory[itemIndex].quantity + itemToRestore.quantity
          };
        }
      });
      return newInventory;
    });
  };

  const value = {
    inventory,
    transactions,
    loading,
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
