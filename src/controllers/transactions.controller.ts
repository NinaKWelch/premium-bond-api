import { type Request, type Response, type NextFunction } from 'express';
import { addTransactionSchema } from '../schemas/bonds.schemas';
import { addTransaction, getTransactions, updateTransaction, removeTransaction } from '../store/store';
import { wouldBalanceGoNegative } from '../services/bonds.service';

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await getTransactions());
  } catch (err) {
    next(err);
  }
}

export async function add(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = addTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
      return;
    }

    if (parsed.data.type === 'withdrawal') {
      const existing = (await getTransactions()).map((t) => ({ ...t, date: new Date(`${t.date.slice(0, 7)}-01`) }));
      const candidate = { ...parsed.data, date: new Date(`${parsed.data.date.slice(0, 7)}-01`) };
      if (wouldBalanceGoNegative([...existing, candidate])) {
        res.status(400).json({ error: 'Withdrawal would exceed current balance' });
        return;
      }
    }

    const record = await addTransaction(parsed.data);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const parsed = addTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
      return;
    }

    // Validate balance by simulating the store with this transaction replaced
    const existing = (await getTransactions())
      .filter((t) => t.id !== id)
      .map((t) => ({ ...t, date: new Date(`${t.date.slice(0, 7)}-01`) }));
    const candidate = { ...parsed.data, date: new Date(`${parsed.data.date.slice(0, 7)}-01`) };
    if (wouldBalanceGoNegative([...existing, candidate])) {
      res.status(400).json({ error: 'Transaction would cause balance to go negative' });
      return;
    }

    const record = await updateTransaction(id, parsed.data);
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
    const id = req.params['id'] as string;
    const deleted = await removeTransaction(id);
    if (!deleted) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
