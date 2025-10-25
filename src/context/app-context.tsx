
'use client';

import * as React from 'react';
import type { FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  onSnapshot,
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
  DocumentReference,
  DocumentSnapshot,
} from 'firebase/firestore';
import type { InventoryItem, Transaction, TransactionItem } from '@/lib/types';

interface AppContextType {
  inventory: InventoryItem[];
  transactions: Transaction[];
  loading: boolean;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventoryItem: (id: string, updatedItem: Partial<Omit<InventoryItem, 'id'>>) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  bulkAddInventoryItems: (items: Omit<InventoryItem, 'id'>[]) => Promise<void>;
  bulkDeleteInventoryItems: (ids: string[]) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, updatedTransactionData: Omit<Transaction, 'id'>, originalTransaction: Transaction) => Promise<void>;
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

    try {
      const db = getFirestore(firebaseApp);
      dbInstanceRef.current = db;

      setLoading(true);
      const inventoryQuery = query(collection(db, 'inventory'), orderBy('itemName'));
      const transactionsQuery = query(collection(db, 'transactions'), orderBy('date', 'desc'));

      const unsubInventory = onSnapshot(inventoryQuery, (snapshot) => {
        const inventoryData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
        setInventory(inventoryData);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching inventory:", error);
        setLoading(false);
      });

      const unsubTransactions = onSnapshot(transactionsQuery, (snapshot) => {
        const transactionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        setTransactions(transactionsData);
        // Do not set loading to false here, inventory is the primary data source for initial load
      }, (error) => {
        console.error("Error fetching transactions:", error);
      });

      return () => {
        unsubInventory();
        unsubTransactions();
      };
    } catch (error) {
        console.error("Failed to initialize Firestore or fetch data:", error);
        setLoading(false);
    }
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
    await addDoc(collection(db, 'inventory'), item);
  };

  const updateInventoryItem = async (id: string, updatedItem: Partial<Omit<InventoryItem, 'id'>>) => {
    const db = getDb();
    const itemDoc = doc(db, 'inventory', id);
    await updateDoc(itemDoc, updatedItem);
  };

  const deleteInventoryItem = async (id: string) => {
    const db = getDb();
    await deleteDoc(doc(db, 'inventory', id));
  };

  const bulkAddInventoryItems = async (items: Omit<InventoryItem, 'id'>[]) => {
    const db = getDb();
    const batch = writeBatch(db);
    const inventoryCollectionRef = collection(db, 'inventory');
    
    // Fetch all existing inventory items once to create a lookup map.
    // This is far more efficient than querying inside a loop.
    const inventorySnapshot = await getDocs(inventoryCollectionRef);
    const existingItemsMap = new Map<string, { id: string; quantity: number }>();
    inventorySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const key = `${data.itemName}_${data.batchNumber}`;
      existingItemsMap.set(key, { id: doc.id, quantity: data.quantity });
    });

    for (const item of items) {
      const key = `${item.itemName}_${item.batchNumber}`;
      const existingItem = existingItemsMap.get(key);

      if (existingItem) {
        // If item exists, update its quantity
        const docRef = doc(db, 'inventory', existingItem.id);
        const newQuantity = (existingItem.quantity || 0) + item.quantity;
        batch.update(docRef, { ...item, quantity: newQuantity });
        // Update the map for subsequent items in the same batch run
        existingItemsMap.set(key, { ...existingItem, quantity: newQuantity });
      } else {
        // If item is new, add it and update the map
        const newDocRef = doc(inventoryCollectionRef);
        batch.set(newDocRef, item);
        existingItemsMap.set(key, { id: newDocRef.id, quantity: item.quantity });
      }
    }
    
    await batch.commit();
  };
  
  const bulkDeleteInventoryItems = async (ids: string[]) => {
    const db = getDb();
    const batch = writeBatch(db);
    ids.forEach(id => {
      const docRef = doc(db, 'inventory', id);
      batch.delete(docRef);
    });
    await batch.commit();
  };

  // TRANSACTION MANAGEMENT & STOCK SYNCHRONIZATION
  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    const db = getDb();
    await runTransaction(db, async (t) => {
      const transactionItems = transaction.items || [];
      if (transactionItems.length === 0) {
        throw new Error("Transaction must have at least one item.");
      }

      for (const soldItem of transactionItems) {
        const itemRef = doc(db, 'inventory', soldItem.itemId);
        const itemDoc = await t.get(itemRef);

        if (!itemDoc.exists()) {
          throw new Error(`Item with id ${soldItem.itemId} does not exist!`);
        }
        
        const currentQuantity = itemDoc.data().quantity;
        if (currentQuantity < soldItem.quantity) {
          throw new Error(`Insufficient stock for item ${itemDoc.data().itemName}. Available: ${currentQuantity}, Required: ${soldItem.quantity}`);
        }
        
        const newQuantity = currentQuantity - soldItem.quantity;
        t.update(itemRef, { quantity: newQuantity });
      }

      const transactionCollection = collection(db, 'transactions');
      t.set(doc(transactionCollection), transaction);
    });
  };

  const updateTransaction = async (id: string, updatedTransactionData: Omit<Transaction, 'id'>, originalTransaction: Transaction) => {
    const db = getDb();
    await runTransaction(db, async (t) => {
        const stockAdjustments = new Map<string, number>();

        // Calculate stock to be returned from original transaction
        originalTransaction.items?.forEach(item => {
            stockAdjustments.set(item.itemId, (stockAdjustments.get(item.itemId) || 0) + item.quantity);
        });

        // Calculate stock to be deducted for the new transaction
        updatedTransactionData.items?.forEach(item => {
            stockAdjustments.set(item.itemId, (stockAdjustments.get(item.itemId) || 0) - item.quantity);
        });

        // If no items were changed, just update the transaction details
        if (stockAdjustments.size === 0) {
            const transactionDocRef = doc(db, 'transactions', id);
            t.update(transactionDocRef, updatedTransactionData);
            return;
        }
        
        for (const [itemId, adjustment] of stockAdjustments.entries()) {
             if (adjustment === 0) continue; // Skip items with no net change

             const itemRef = doc(db, 'inventory', itemId);
             const itemDoc = await t.get(itemRef);

             if (!itemDoc.exists()) {
                 throw new Error(`Item with id ${itemId} was not found.`);
             }

             const currentQuantity = itemDoc.data()?.quantity || 0;
             const newQuantity = currentQuantity + adjustment;

             if (newQuantity < 0) {
                 throw new Error(`Insufficient stock for item ${itemDoc.data()?.itemName}. Required change would result in negative stock.`);
             }
             
             t.update(itemRef, { quantity: newQuantity });
        }

        const transactionDocRef = doc(db, 'transactions', id);
        t.update(transactionDocRef, updatedTransactionData);
    });
};


 const deleteTransaction = async (id: string, transactionToDelete: Transaction) => {
     const db = getDb();
     await runTransaction(db, async (t) => {
        const itemsToRestore = transactionToDelete.items || [];
        if (itemsToRestore.length === 0) {
             const transactionDocRef = doc(db, 'transactions', id);
             t.delete(transactionDocRef);
             return;
        }

        for (const itemToRestore of itemsToRestore) {
          const itemRef = doc(db, 'inventory', itemToRestore.itemId);
          const itemDoc = await t.get(itemRef);
          
          if (itemDoc.exists()) {
              const currentQuantity = itemDoc.data().quantity || 0;
              const newQuantity = currentQuantity + itemToRestore.quantity;
              t.update(itemRef, { quantity: newQuantity });
          } else {
              console.warn(`Inventory item with ID ${itemToRestore.itemId} not found. Cannot restore stock.`);
          }
        }
        
        const transactionDocRef = doc(db, 'transactions', id);
        t.delete(transactionDocRef);
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
