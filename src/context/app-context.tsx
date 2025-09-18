
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
      if (!transaction.items || transaction.items.length === 0) {
        throw new Error("Transaction must have at least one item.");
      }

      // 1. READ PHASE: Get all documents first.
      const itemRefs = transaction.items.map(item => doc(db, 'inventory', item.itemId));
      const itemDocs = await Promise.all(itemRefs.map(ref => t.get(ref)));

      // 2. VALIDATION PHASE: Check stock and data integrity.
      for (let i = 0; i < transaction.items.length; i++) {
        const soldItem = transaction.items[i];
        const itemDoc = itemDocs[i];

        if (!itemDoc.exists()) {
          throw new Error(`Item with id ${soldItem.itemId} does not exist!`);
        }
        const currentQuantity = itemDoc.data().quantity;
        if (currentQuantity < soldItem.quantity) {
          throw new Error(`Insufficient stock for item ${itemDoc.data().itemName}. Available: ${currentQuantity}, Required: ${soldItem.quantity}`);
        }
      }

      // 3. WRITE PHASE: Perform all writes after all reads are complete.
      for (let i = 0; i < transaction.items.length; i++) {
        const soldItem = transaction.items[i];
        const itemDoc = itemDocs[i];
        const currentQuantity = itemDoc.data().quantity;
        t.update(itemRefs[i], { quantity: currentQuantity - soldItem.quantity });
      }

      const transactionCollection = collection(db, 'transactions');
      t.set(doc(transactionCollection), transaction);
    });
  };

  const updateTransaction = async (id: string, updatedTransactionData: Omit<Transaction, 'id'>, originalTransaction: Transaction) => {
    const db = getDb();
    await runTransaction(db, async (t) => {
      // 1. READ PHASE
      const itemIds = new Set<string>();
      (originalTransaction.items || []).forEach(item => itemIds.add(item.itemId));
      (updatedTransactionData.items || []).forEach(item => itemIds.add(item.itemId));
      
      const itemRefs: DocumentReference[] = Array.from(itemIds).map(itemId => doc(db, 'inventory', itemId));
      const itemDocs = await Promise.all(itemRefs.map(ref => t.get(ref)));
      
      const inventoryMap = new Map<string, DocumentSnapshot>();
      itemDocs.forEach((docSnap, index) => {
        if (docSnap.exists()) {
          inventoryMap.set(itemRefs[index].id, docSnap);
        }
      });
      
      const stockChanges = new Map<string, number>();

      // Calculate stock restoration from original transaction
      (originalTransaction.items || []).forEach(item => {
        stockChanges.set(item.itemId, (stockChanges.get(item.itemId) || 0) + item.quantity);
      });
      
      // Calculate stock deduction for updated transaction
      (updatedTransactionData.items || []).forEach(item => {
        stockChanges.set(item.itemId, (stockChanges.get(item.itemId) || 0) - item.quantity);
      });

      // 2. VALIDATION PHASE
      for (const [itemId, change] of stockChanges.entries()) {
        const itemDoc = inventoryMap.get(itemId);
        if (!itemDoc) {
          throw new Error(`Item with id ${itemId} does not exist!`);
        }
        const currentQuantity = itemDoc.data()?.quantity || 0;
        // The final quantity is the current stock plus the net change
        if (currentQuantity + change < 0) {
           throw new Error(`Insufficient stock for item ${itemDoc.data()?.itemName}. Required change: ${-change}, Available: ${currentQuantity}`);
        }
      }

      // 3. WRITE PHASE
      for (const [itemId, change] of stockChanges.entries()) {
        const itemDoc = inventoryMap.get(itemId)!;
        const newQuantity = (itemDoc.data()?.quantity || 0) + change;
        t.update(itemDoc.ref, { quantity: newQuantity });
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

        // 1. READ PHASE
        const itemRefs = itemsToRestore.map(item => doc(db, 'inventory', item.itemId));
        const itemDocs = await Promise.all(itemRefs.map(ref => t.get(ref)));

        // 2. WRITE PHASE
        for (let i = 0; i < itemsToRestore.length; i++) {
          const itemToRestore = itemsToRestore[i];
          const itemDoc = itemDocs[i];
          
          if (itemDoc.exists()) {
              const currentQuantity = itemDoc.data().quantity || 0;
              const newQuantity = currentQuantity + itemToRestore.quantity;
              t.update(itemRefs[i], { quantity: newQuantity });
          } else {
              // Optionally handle case where item was deleted from inventory
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
