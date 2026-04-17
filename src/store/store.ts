import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import type { TransactionType } from '../generated/prisma/enums.js';

export interface StoredTransaction {
  id: string;
  date: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'reinvestment';
}

export interface StoredPrize {
  id: string;
  date: string;
  amount: number;
}

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter });

export async function getTransactions(): Promise<StoredTransaction[]> {
  const rows = await prisma.transaction.findMany({ orderBy: { date: 'asc' } });
  return rows.map((r) => ({ ...r, type: r.type as 'deposit' | 'withdrawal' | 'reinvestment' }));
}

export async function getPrizes(): Promise<StoredPrize[]> {
  return prisma.prize.findMany({ orderBy: { date: 'asc' } });
}

export async function getAll(): Promise<{ transactions: StoredTransaction[]; prizes: StoredPrize[] }> {
  const [transactions, prizes] = await Promise.all([getTransactions(), getPrizes()]);
  return { transactions, prizes };
}

export async function addTransaction(
  data: Omit<StoredTransaction, 'id'>,
): Promise<StoredTransaction> {
  const row = await prisma.transaction.create({
    data: { ...data, type: data.type as TransactionType },
  });
  return { ...row, type: row.type as 'deposit' | 'withdrawal' | 'reinvestment' };
}

export async function updateTransaction(
  id: string,
  data: Omit<StoredTransaction, 'id'>,
): Promise<StoredTransaction | null> {
  try {
    const row = await prisma.transaction.update({
      where: { id },
      data: { ...data, type: data.type as TransactionType },
    });
    return { ...row, type: row.type as 'deposit' | 'withdrawal' | 'reinvestment' };
  } catch {
    return null;
  }
}

export async function removeTransaction(id: string): Promise<boolean> {
  try {
    await prisma.transaction.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function addPrize(data: Omit<StoredPrize, 'id'>): Promise<StoredPrize> {
  return prisma.prize.create({ data });
}

export async function updatePrize(
  id: string,
  data: Omit<StoredPrize, 'id'>,
): Promise<StoredPrize | null> {
  try {
    return await prisma.prize.update({ where: { id }, data });
  } catch {
    return null;
  }
}

export async function removePrize(id: string): Promise<boolean> {
  try {
    await prisma.prize.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}
