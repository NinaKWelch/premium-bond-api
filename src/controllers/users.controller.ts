import { type Request, type Response, type NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { registerSchema, loginSchema } from '../schemas/users.schemas.js';
import { createUser, findUserByEmail, getAllUsersWithActivity, findUserWithActivity, deleteUser } from '../store/users.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const SALT_ROUNDS = 12;

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = registerSchema.safeParse(req.body);
    
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const { email, password } = parsed.data;

    const existing = await findUserByEmail(email);

    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser(email, passwordHash);

    res.status(201).json({ id: user.id, email: user.email });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const { email, password } = parsed.data;

    const user = await findUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const secret = process.env['JWT_SECRET'];
    if (!secret) {
      res.status(500).json({ error: 'Server misconfiguration' });
      return;
    }

    const token = jwt.sign({ sub: user.id, email: user.email }, secret, { expiresIn: '30d' });

    res.json({ id: user.id, email: user.email, token });
  } catch (err) {
    next(err);
  }
}

export async function listUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await getAllUsersWithActivity();

    res.json(users);
  } catch (err) {
    next(err);
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await findUserWithActivity(req.params['id'] as string);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req as AuthenticatedRequest;

    await deleteUser(userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
