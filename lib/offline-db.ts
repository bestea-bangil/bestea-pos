import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface BesteaDB extends DBSchema {
  transactions: {
    key: string;
    value: any;
  };
  attendance: {
    key: string;
    value: any;
  };
  products: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'bestea-pos-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<BesteaDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<BesteaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('transactions')) {
          db.createObjectStore('transactions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('attendance')) {
          db.createObjectStore('attendance', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export const saveOfflineTransaction = async (transaction: any) => {
  const db = await initDB();
  // Ensure transaction has an ID
  if (!transaction.id) {
    transaction.id = crypto.randomUUID();
  }
  await db.put('transactions', { ...transaction, offline: true, timestamp: Date.now() });
};

export const getPendingTransactions = async () => {
  const db = await initDB();
  return db.getAll('transactions');
};

export const deleteTransaction = async (id: string) => {
  const db = await initDB();
  await db.delete('transactions', id);
};

export const saveProductsCache = async (products: any[]) => {
  const db = await initDB();
  const tx = db.transaction('products', 'readwrite');
  await Promise.all([
    ...products.map(p => tx.store.put(p)),
    tx.done
  ]);
};

export const getProductsCache = async () => {
  const db = await initDB();
  return db.getAll('products');
};



export const saveOfflineAttendance = async (attendance: any) => {
  const db = await initDB();
  // Ensure attendance has an ID
  if (!attendance.id) {
    attendance.id = crypto.randomUUID();
  }
  await db.put('attendance', { ...attendance, offline: true, timestamp: Date.now() });
};

export const getPendingAttendance = async () => {
  const db = await initDB();
  return db.getAll('attendance');
};

export const deleteAttendance = async (id: string) => {
  const db = await initDB();
  await db.delete('attendance', id);
};
