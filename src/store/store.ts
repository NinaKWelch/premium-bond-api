import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const STORE_PATH = path.join(__dirname, '../../data/store.json');
const EMPTY_STORE: Store = { transactions: [], prizes: [] };

// Synchronous I/O is intentional — this is a single-user local tool with no
// concurrent writes, so sync keeps the code simple without any practical cost.

export interface StoredTransaction {
  id: string;
  date: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
}

export interface StoredPrize {
  id: string;
  date: string;
  amount: number;
}

interface Store {
  transactions: StoredTransaction[];
  prizes: StoredPrize[];
}

function read(): Store {
  if (!fs.existsSync(STORE_PATH)) {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(EMPTY_STORE, null, 2));
    return EMPTY_STORE;
  }
  const raw = fs.readFileSync(STORE_PATH, 'utf-8');
  return JSON.parse(raw) as Store;
}

function write(store: Store): void {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function getAll(): Store {
  return read();
}

export function getTransactions(): StoredTransaction[] {
  return read().transactions;
}

export function getPrizes(): StoredPrize[] {
  return read().prizes;
}

export function addTransaction(
  data: Omit<StoredTransaction, 'id'>
): StoredTransaction {
  const store = read();
  const record: StoredTransaction = { id: crypto.randomUUID(), ...data };
  store.transactions.push(record);
  write(store);
  return record;
}

export function removeTransaction(id: string): boolean {
  const store = read();
  const before = store.transactions.length;
  store.transactions = store.transactions.filter((t) => t.id !== id);
  // If the length didn't change, no record matched the id
  if (store.transactions.length === before) return false;
  write(store);
  return true;
}

export function addPrize(data: Omit<StoredPrize, 'id'>): StoredPrize {
  const store = read();
  const record: StoredPrize = { id: crypto.randomUUID(), ...data };
  store.prizes.push(record);
  write(store);
  return record;
}

export function updateTransaction(
  id: string,
  data: Omit<StoredTransaction, 'id'>
): StoredTransaction | null {
  const store = read();
  const index = store.transactions.findIndex((t) => t.id === id);
  if (index === -1) return null;
  store.transactions[index] = { id, ...data };
  write(store);
  return store.transactions[index];
}

export function updatePrize(
  id: string,
  data: Omit<StoredPrize, 'id'>
): StoredPrize | null {
  const store = read();
  const index = store.prizes.findIndex((p) => p.id === id);
  if (index === -1) return null;
  store.prizes[index] = { id, ...data };
  write(store);
  return store.prizes[index];
}

export function removePrize(id: string): boolean {
  const store = read();
  const before = store.prizes.length;
  store.prizes = store.prizes.filter((p) => p.id !== id);
  // If the length didn't change, no record matched the id
  if (store.prizes.length === before) return false;
  write(store);
  return true;
}
