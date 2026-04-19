import { type Request, type Response, type NextFunction } from 'express';
import { addTransactionSchema } from '../schemas/bonds.schemas';
import { addTransaction, getTransactions, getPrizes, updateTransaction, removeTransaction } from '../store/store';
import { wouldBalanceGoNegative } from '../services/bonds.service';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req as AuthenticatedRequest;
    res.json(await getTransactions(userId));
  } catch (err) {
    next(err);
  }
}

export async function add(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req as AuthenticatedRequest;
    const parsed = addTransactionSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
      return;
    }

    if (parsed.data.type === 'withdrawal') {
      const existing = (await getTransactions(userId)).map((t) => ({ ...t, date: new Date(`${t.date.slice(0, 7)}-01`) }));
      const candidate = { ...parsed.data, date: new Date(`${parsed.data.date.slice(0, 7)}-01`) };
      
      if (wouldBalanceGoNegative([...existing, candidate])) {
        res.status(400).json({ error: 'Withdrawal would exceed current balance' });
        return;
      }
    }

    const record = await addTransaction(userId, parsed.data);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req as AuthenticatedRequest;
    const id = req.params['id'] as string;
    const parsed = addTransactionSchema.safeParse(req.body);
    
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });

      return;
    }

    const existing = (await getTransactions(userId))
      .filter((t) => t.id !== id)
      .map((t) => ({ ...t, date: new Date(`${t.date.slice(0, 7)}-01`) }));
    const candidate = { ...parsed.data, date: new Date(`${parsed.data.date.slice(0, 7)}-01`) };
    
    if (wouldBalanceGoNegative([...existing, candidate])) {
      res.status(400).json({ error: 'Transaction would cause balance to go negative' });
      return;
    }

    const record = await updateTransaction(id, userId, parsed.data);
    
    if (!record) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    res.json(record);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req as AuthenticatedRequest;
    const id = req.params['id'] as string;

    const all = await getTransactions(userId);
    const target = all.find((t) => t.id === id);

    if (!target) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const toDate = (ym: string) => new Date(`${ym.slice(0, 7)}-01`);
    const remaining = all.filter((t) => t.id !== id).map((t) => ({ ...t, date: toDate(t.date) }));

    if (wouldBalanceGoNegative(remaining)) {
      res.status(400).json({
        error: 'This transaction cannot be deleted — a withdrawal depends on it. Delete the withdrawal first.',
      });
      return;
    }

    if (target.type === 'deposit') {
      const prizes = await getPrizes(userId);
      const newFirstDeposit = remaining
        .filter((t) => t.type === 'deposit')
        .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

      const hasOrphanedPrize = prizes.some((p) => {
        const prizeYM = toDate(p.date).getFullYear() * 12 + toDate(p.date).getMonth();
        const depositYM = newFirstDeposit
          ? newFirstDeposit.date.getFullYear() * 12 + newFirstDeposit.date.getMonth()
          : Infinity;
        return prizeYM <= depositYM;
      });

      if (hasOrphanedPrize) {
        res.status(400).json({
          error: 'This deposit cannot be deleted — prizes exist that depend on it. Delete those prizes first.',
        });
        return;
      }
    }

    await removeTransaction(id, userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
