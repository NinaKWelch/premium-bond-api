import { type Request, type Response, type NextFunction } from 'express';
import { calculateBondStats } from '../services/bonds.service';
import { getAll } from '../store/store';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export async function calculate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { transactions, prizes } = await getAll(userId);

    if (!transactions.some((t) => t.type === 'deposit')) {
      res.status(400).json({ error: 'No deposits found — add at least one deposit first' });
      return;
    }

    const result = calculateBondStats(
      transactions.map((t) => ({ ...t, date: new Date(`${t.date.slice(0, 7)}-01`) })),
      prizes.map((p) => ({ ...p, date: new Date(`${p.date.slice(0, 7)}-01`) }))
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
}
