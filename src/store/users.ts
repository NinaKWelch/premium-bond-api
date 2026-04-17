import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import type { StoredTransaction, StoredPrize } from './store.js';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter });

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface StoredUserWithActivity extends Omit<StoredUser, 'passwordHash'> {
  premiumBonds: {
    transactions: StoredTransaction[];
    prizes: StoredPrize[];
  };
}

const WITH_ACTIVITY = {
  include: {
    transactions: { orderBy: { date: 'asc' as const } },
    prizes: { orderBy: { date: 'asc' as const } },
  },
};

export async function createUser(email: string, passwordHash: string): Promise<StoredUser> {
  return prisma.user.create({ data: { email, passwordHash } });
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await prisma.user.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

function toUserWithActivity(row: {
  id: string;
  email: string;
  createdAt: Date;
  transactions: { id: string; date: string; amount: number; type: string; userId: string }[];
  prizes: { id: string; date: string; amount: number; userId: string }[];
}): StoredUserWithActivity {
  const { transactions, prizes, ...user } = row;

  return {
    ...user,
    premiumBonds: {
      transactions: transactions.map(({ userId: _uid, type, ...t }) => ({
        ...t,
        type: type as StoredTransaction['type'],
      })),
      prizes: prizes.map(({ userId: _uid, ...p }) => p),
    },
  };
}

export async function getAllUsersWithActivity(): Promise<StoredUserWithActivity[]> {
  const rows = await prisma.user.findMany({
    ...WITH_ACTIVITY,
    orderBy: { createdAt: 'asc' },
  });

  return rows.map(({ passwordHash: _ph, ...rest }) => toUserWithActivity(rest));
}

export async function findUserWithActivity(id: string): Promise<StoredUserWithActivity | null> {
  const row = await prisma.user.findUnique({ where: { id }, ...WITH_ACTIVITY });

  if (!row) return null;

  const { passwordHash: _ph, ...rest } = row;
  
  return toUserWithActivity(rest);
}
