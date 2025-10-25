
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
    const inventoryCollectionRef = collection(db, 'inventory');
    
    // Fetch all existing items ONCE to avoid multiple reads inside a loop.
    const inventorySnapshot = await getDocs(inventoryCollectionRef);
    const existingItemsMap = new Map<string, { id: string; quantity: number }>();
    inventorySnapshot.docs.forEach(doc => {
      const data = doc.data();
      // A unique key for an item batch is its name + batch number
      const key = `${data.itemName}_${data.batchNumber}`;
      existingItemsMap.set(key, { id: doc.id, quantity: data.quantity });
    });

    const batch = writeBatch(db);
    const newDocsForState: InventoryItem[] = [];
    const updatedDocsForState: {[id: string]: Partial<InventoryItem>} = {};

    for (const item of items) {
      const key = `${item.itemName}_${item.batchNumber}`;
      const existingItem = existingItemsMap.get(key);

      if (existingItem) {
        // If item exists, update its quantity
        const docRef = doc(db, 'inventory', existingItem.id);
        const newQuantity = (existingItem.quantity || 0) + item.quantity;
        const updatePayload = { ...item, quantity: newQuantity };
        batch.update(docRef, updatePayload);
        
        // Prepare for local state update
        updatedDocsForState[existingItem.id] = updatePayload;
        // Update the map for subsequent rows in the same Excel file
        existingItemsMap.set(key, { ...existingItem, quantity: newQuantity }); 
      } else {
        // If item is new, add it
        const newDocRef = doc(inventoryCollectionRef);
        batch.set(newDocRef, item);

        // Prepare for local state update
        const newItemWithId = { id: newDocRef.id, ...item } as InventoryItem;
        newDocsForState.push(newItemWithId);
        // Add to map to handle duplicates within the same Excel file
        existingItemsMap.set(key, { id: newDocRef.id, quantity: item.quantity });
      }
    }
    
    await batch.commit();

    // Update local state efficiently
    setInventory(prev => {
        const updatedFromBatch = prev.map(i => i.id in updatedDocsForState ? { ...i, ...updatedDocsForState[i.id] } : i);
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
    const transactionItems = transaction.items || [];
    if (transactionItems.length === 0) {
      throw new Error("Transaksi harus memiliki setidaknya satu item.");
    }

    const newTransactionRef = doc(collection(db, "transactions"));

    await runTransaction(db, async (t) => {
      const stockAdjustments: { ref: DocumentReference; newQuantity: number; itemName: string }[] = [];

      for (const soldItem of transactionItems) {
        const itemRef = doc(db, 'inventory', soldItem.itemId);
        const itemDoc = await t.get(itemRef);

        if (!itemDoc.exists()) {
          throw new Error(`Item "${soldItem.itemName}" tidak ada di inventaris!`);
        }
        
        const currentQuantity = itemDoc.data().quantity;
        if (currentQuantity < soldItem.quantity) {
          throw new Error(`Stok tidak mencukupi untuk "${itemDoc.data().itemName}". Tersedia: ${currentQuantity}, Dibutuhkan: ${soldItem.quantity}`);
        }
        
        const newQuantity = currentQuantity - soldItem.quantity;
        stockAdjustments.push({ ref: itemRef, newQuantity, itemName: itemDoc.data().itemName });
      }

      // Set the new transaction document WITHIN the atomic transaction
      t.set(newTransactionRef, transaction);
      
      // Apply all stock updates
      for (const { ref, newQuantity } of stockAdjustments) {
        t.update(ref, { quantity: newQuantity });
      }
    });

    // If runTransaction is successful, update local state
    const newTransaction = { id: newTransactionRef.id, ...transaction } as Transaction;
    setTransactions(prev => [newTransaction, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  
    setInventory(prevInventory => {
      const inventoryMap = new Map(prevInventory.map(item => [item.id, item]));
      transactionItems.forEach(soldItem => {
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
    
    return newTransactionRef;
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
        const stockAdjustments = new Map<string, { adjustment: number, name: string }>();

        // Calculate adjustments needed. Positive means returning to stock, negative means taking from stock.
        (originalTransaction.items || []).forEach(item => {
            const current = stockAdjustments.get(item.itemId) || { adjustment: 0, name: 'Unknown' };
            stockAdjustments.set(item.itemId, { ...current, adjustment: current.adjustment + item.quantity });
        });

        (updatedTransactionData.items || []).forEach(item => {
            const current = stockAdjustments.get(item.itemId) || { adjustment: 0, name: item.itemName };
            stockAdjustments.set(item.itemId, { ...current, adjustment: current.adjustment - item.quantity, name: item.itemName });
        });

        // Apply adjustments
        for (const [itemId, { adjustment, name }] of stockAdjustments.entries()) {
             if (adjustment === 0) continue; 

             const itemDocRef = doc(db, 'inventory', itemId);
             const itemDoc = await t.get(itemDocRef);

             if (!itemDoc.exists()) {
                 throw new Error(`Item inventaris "${name}" tidak ditemukan.`);
             }

             const currentQuantity = itemDoc.data()?.quantity || 0;
             const newQuantity = currentQuantity + adjustment;

             if (newQuantity < 0) {
                 throw new Error(`Stok tidak mencukupi untuk item "${itemDoc.data()?.itemName}".`);
             }
             
             t.update(itemDocRef, { quantity: newQuantity });
        }
        
        // Finally, update the transaction document itself.
        t.update(transactionDocRef, updatedTransactionData);
    });

    // Update local state only after successful transaction
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
            // If it doesn't exist on the server, just remove from local state
            console.warn(`Transaction ${id} not found on server, deleting locally.`);
            return; 
        }

        const itemsToRestore = (transactionDoc.data() as Transaction).items || [];
        for (const itemToRestore of itemsToRestore) {
            const itemRef = doc(db, 'inventory', itemToRestore.itemId);
            const itemDoc = await t.get(itemRef);
            
            if (itemDoc.exists()) {
                const currentQuantity = itemDoc.data().quantity || 0;
                const newQuantity = currentQuantity + itemToRestore.quantity;
                t.update(itemRef, { quantity: newQuantity });
            }
        }
        t.delete(transactionDocRef);
    });

    // Update local state after successful deletion
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
