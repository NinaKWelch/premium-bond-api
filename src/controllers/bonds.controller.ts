import { type Request, type Response, type NextFunction } from 'express';
import { calculateBondStats } from '../services/bonds.service';
import { getAll } from '../store/store';

export function calculate(_req: Request, res: Response, next: NextFunction): void {
  try {
    const { transactions, prizes } = getAll();

    if (!transactions.some((t) => t.type === 'deposit')) {
      res.status(400).json({ error: 'No deposits found — add at least one deposit first' });
      return;
    }

    const result = calculateBondStats(
      transactions.map((t) => ({ ...t, date: new Date(t.date) })),
      prizes.map((p) => ({ ...p, date: new Date(p.date) }))
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
}
