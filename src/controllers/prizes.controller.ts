import { type Request, type Response, type NextFunction } from 'express';
import { addPrizeSchema } from '../schemas/bonds.schemas';
import { addPrize, getPrizes, getTransactions, updatePrize, removePrize } from '../store/store';
import { isPrizeEligible } from '../services/bonds.service';

async function validatePrizeDate(date: string, res: Response): Promise<boolean> {
  const deposits = (await getTransactions()).map((t) => ({ ...t, date: new Date(`${t.date.slice(0, 7)}-01`) }));
  if (!isPrizeEligible(new Date(`${date.slice(0, 7)}-01`), deposits)) {
    if (deposits.filter((t) => t.type === 'deposit').length === 0) {
      res.status(400).json({ error: 'No deposits found — add a deposit before recording prizes' });
    } else {
      res.status(400).json({
        error: 'Prize date must be in a later month than the first deposit (bonds enter the draw the month after purchase)',
      });
    }
    return false;
  }
  return true;
}

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await getPrizes());
  } catch (err) {
    next(err);
  }
}

export async function add(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = addPrizeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
      return;
    }
    if (!(await validatePrizeDate(parsed.data.date, res))) return;

    const record = await addPrize(parsed.data);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const parsed = addPrizeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
      return;
    }
    if (!(await validatePrizeDate(parsed.data.date, res))) return;

    const record = await updatePrize(id, parsed.data);
    if (!record) {
      res.status(404).json({ error: 'Prize not found' });
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
    const deleted = await removePrize(id);
    if (!deleted) {
      res.status(404).json({ error: 'Prize not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
