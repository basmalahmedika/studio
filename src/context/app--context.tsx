
'use client';

import * as React from 'react';
import { initializeFirebase } from '@/lib/firebase';
import {
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
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import type { InventoryItem, Transaction } from '@/lib/types';

interface AppContextType {
  inventory: InventoryItem[];
  transactions: Transaction[];
  loading: boolean;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventoryItem: (id: string, updatedItem: Partial<Omit<InventoryItem, 'id'>>) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  bulkAddInventoryItems: (items: Omit<InventoryItem, 'id'>[]) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, updatedTransactionData: Omit<Transaction, 'id'>, originalTransaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string, transactionToDelete: Transaction) => Promise<void>;
}

const AppContext = React.createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [inventory, setInventory] = React.useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const dbInstanceRef = React.useRef<Firestore | null>(null);

  React.useEffect(() => {
    try {
      const app = initializeFirebase();
      const db = getFirestore(app);
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
      }, (error) => {
        console.error("Error fetching transactions:", error);
      });

      return () => {
        unsubInventory();
        unsubTransactions();
      };
    } catch (error) {
        console.error("Failed to initialize Firebase or fetch data:", error);
        setLoading(false);
    }
  }, []);

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
      const inventoryCollection = collection(db, 'inventory');
      
      for (const item of items) {
          const q = query(inventoryCollection, where("itemName", "==", item.itemName), where("batchNumber", "==", item.batchNumber));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
              const existingDoc = querySnapshot.docs[0];
              const docRef = doc(db, 'inventory', existingDoc.id);
              const newQuantity = (existingDoc.data().quantity || 0) + item.quantity;
              batch.update(docRef, { ...item, quantity: newQuantity });
          } else {
              const newDocRef = doc(inventoryCollection);
              batch.set(newDocRef, item);
          }
      }
      
      await batch.commit();
  };

  // TRANSACTION MANAGEMENT & STOCK SYNCHRONIZATION
  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    const db = getDb();
    await runTransaction(db, async (t) => {
      if (transaction.items) {
        for (const soldItem of transaction.items) {
          const itemDocRef = doc(db, 'inventory', soldItem.itemId);
          const itemDoc = await t.get(itemDocRef);
          if (!itemDoc.exists()) {
            throw new Error(`Item with id ${soldItem.itemId} does not exist!`);
          }
          const currentQuantity = itemDoc.data().quantity;
          if (currentQuantity < soldItem.quantity) {
             throw new Error(`Insufficient stock for item ${itemDoc.data().itemName}.`);
          }
          t.update(itemDocRef, { quantity: currentQuantity - soldItem.quantity });
        }
      }
      const transactionCollection = collection(db, 'transactions');
      t.set(doc(transactionCollection), transaction);
    });
  };

  const updateTransaction = async (id: string, updatedTransactionData: Omit<Transaction, 'id'>, originalTransaction: Transaction) => {
    const db = getDb();
    await runTransaction(db, async (t) => {
        if (originalTransaction.items) {
            for (const soldItem of originalTransaction.items) {
                const itemDocRef = doc(db, 'inventory', soldItem.itemId);
                const itemDoc = await t.get(itemDocRef);
                if (itemDoc.exists()) {
                    const newQuantity = (itemDoc.data().quantity || 0) + soldItem.quantity;
                    t.update(itemDocRef, { quantity: newQuantity });
                }
            }
        }
        if (updatedTransactionData.items) {
            for (const soldItem of updatedTransactionData.items) {
                const itemDocRef = doc(db, 'inventory', soldItem.itemId);
                const itemDoc = await t.get(itemDocRef);
                if (!itemDoc.exists()) {
                   throw new Error(`Item with id ${soldItem.itemId} does not exist!`);
                }
                const currentQuantity = itemDoc.data().quantity;
                if (currentQuantity < soldItem.quantity) {
                    throw new Error(`Insufficient stock for item ${itemDoc.data().itemName}.`);
                }
                t.update(itemDocRef, { quantity: currentQuantity - soldItem.quantity });
            }
        }
        const transactionDocRef = doc(db, 'transactions', id);
        t.update(transactionDocRef, updatedTransactionData);
    });
  };


 const deleteTransaction = async (id: string, transactionToDelete: Transaction) => {
     const db = getDb();
     await runTransaction(db, async (t) => {
        if (transactionToDelete.items) {
            for (const soldItem of transactionToDelete.items) {
                const itemDocRef = doc(db, 'inventory', soldItem.itemId);
                const itemDoc = await t.get(itemDocRef);
                if (itemDoc.exists()) {
                     const newQuantity = (itemDoc.data().quantity || 0) + soldItem.quantity;
                    t.update(itemDocRef, { quantity: newQuantity });
                }
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
