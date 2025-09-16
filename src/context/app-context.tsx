
'use client';

import * as React from 'react';
import type { InventoryItem, Transaction, TransactionItem } from '@/lib/types';
import { inventory as initialInventoryData, transactions as initialTransactionsData } from '@/lib/data';

interface AppContextType {
  inventory: InventoryItem[];
  transactions: Transaction[];
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventoryItem: (id: string, updatedItem: InventoryItem) => void;
  deleteInventoryItem: (id: string) => void;
  bulkAddInventoryItems: (items: Omit<InventoryItem, 'id'>[]) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, updatedTransaction: Omit<Transaction, 'id' | 'items'> & { items: (Omit<TransactionItem, 'itemName' | 'stock'>)[] }, originalTransaction: Transaction) => void;
  deleteTransaction: (id: string, transactionToDelete: Transaction) => void;
}

const AppContext = React.createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [inventory, setInventory] = React.useState<InventoryItem[]>(initialInventoryData);
  const [transactions, setTransactions] = React.useState<Transaction[]>(initialTransactionsData);

  // INVENTORY MANAGEMENT
  const addInventoryItem = (item: Omit<InventoryItem, 'id'>) => {
    setInventory(prev => [...prev, { ...item, id: `inv${Date.now()}` }]);
  };

  const updateInventoryItem = (id: string, updatedItem: InventoryItem) => {
    setInventory(prev => prev.map(item => item.id === id ? updatedItem : item));
  };

  const deleteInventoryItem = (id: string) => {
    setInventory(prev => prev.filter(item => item.id !== id));
  };
  
  const bulkAddInventoryItems = (items: Omit<InventoryItem, 'id'>[]) => {
    const newItems = items.map((item, index) => ({...item, id: `inv${Date.now() + index}`}));
    setInventory(prev => [...prev, ...newItems]);
  };

  // TRANSACTION MANAGEMENT & STOCK SYNCHRONIZATION
  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    // 1. Decrease stock
    setInventory(prevInventory => {
      const newInventory = [...prevInventory];
      if (transaction.items) {
          transaction.items.forEach(soldItem => {
          const itemIndex = newInventory.findIndex(invItem => invItem.id === soldItem.itemId);
          if (itemIndex > -1) {
            newInventory[itemIndex].quantity -= soldItem.quantity;
          }
        });
      }
      return newInventory;
    });

    // 2. Add transaction record
    setTransactions(prev => [{ ...transaction, id: `trx${Date.now()}` }, ...prev]);
  };

  const updateTransaction = (id: string, updatedTransactionData: Omit<Transaction, 'id'>, originalTransaction: Transaction) => {
     // 1. Revert stock from original transaction
     setInventory(prevInventory => {
      let newInventory = [...prevInventory];
      if (originalTransaction.items) {
          originalTransaction.items.forEach(soldItem => {
              const itemIndex = newInventory.findIndex(invItem => invItem.id === soldItem.itemId);
              if (itemIndex > -1) {
                  newInventory[itemIndex].quantity += soldItem.quantity;
              }
          });
      }

      // 2. Decrease stock for updated transaction
      if (updatedTransactionData.items) {
          updatedTransactionData.items.forEach(soldItem => {
              const itemIndex = newInventory.findIndex(invItem => invItem.id === soldItem.itemId);
              if (itemIndex > -1) {
                  newInventory[itemIndex].quantity -= soldItem.quantity;
              }
          });
      }
      return newInventory;
    });

    // 3. Update transaction record
    setTransactions(prev => prev.map(t => t.id === id ? { ...updatedTransactionData, id } : t));
  }

  const deleteTransaction = (id: string, transactionToDelete: Transaction) => {
    // 1. Revert stock (add back to inventory)
    setInventory(prevInventory => {
        const newInventory = [...prevInventory];
        if (transactionToDelete.items) {
            transactionToDelete.items.forEach(soldItem => {
            const itemIndex = newInventory.findIndex(invItem => invItem.id === soldItem.itemId);
            if (itemIndex > -1) {
                newInventory[itemIndex].quantity += soldItem.quantity;
            }
            });
        }
        return newInventory;
    });
    
    // 2. Delete transaction record
    setTransactions(prev => prev.filter(t => t.id !== id));
  };


  const value = {
    inventory,
    transactions,
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
