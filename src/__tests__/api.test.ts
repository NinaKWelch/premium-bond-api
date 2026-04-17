import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../app';
import type * as StoreModule from '../store/store';

const TEST_SECRET = 'test-jwt-secret';
const TEST_USER_ID = 'test-user-id';

process.env['JWT_SECRET'] = TEST_SECRET;

const authToken = jwt.sign({ sub: TEST_USER_ID }, TEST_SECRET);
const bearer = { Authorization: `Bearer ${authToken}` };

// Isolate tests from the real database — mock both store modules to avoid loading Prisma client
jest.mock('../store/users', () => ({
  createUser: jest.fn(),
  findUserByEmail: jest.fn(),
  findUserById: jest.fn(),
  getAllUsersWithActivity: jest.fn(),
  findUserWithActivity: jest.fn(),
  deleteUser: jest.fn(),
}));

import type * as UsersModule from '../store/users';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockUsers = require('../store/users') as jest.Mocked<typeof UsersModule>;

jest.mock('../store/store', () => ({
  getTransactions: jest.fn(),
  getPrizes: jest.fn(),
  getAll: jest.fn(),
  addTransaction: jest.fn(),
  updateTransaction: jest.fn(),
  removeTransaction: jest.fn(),
  addPrize: jest.fn(),
  updatePrize: jest.fn(),
  removePrize: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockStore = require('../store/store') as jest.Mocked<typeof StoreModule>;

const DEPOSIT = { date: '2022-01', amount: 1000, type: 'deposit' as const };
const PRIZE = { date: '2022-06', amount: 25 };

beforeEach(() => jest.clearAllMocks());

describe('auth', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/bonds/transactions').expect(401);
    expect(res.body.error).toMatch(/authentication required/i);
  });
});

describe('GET /api/bonds/calculate', () => {
  it('returns 200 with calculation when store has data', async () => {
    mockStore.getAll.mockResolvedValue({
      transactions: [{ id: '1', ...DEPOSIT }],
      prizes: [{ id: '1', ...PRIZE }],
    });

    const res = await request(app).get('/api/bonds/calculate').set(bearer).expect(200);
    expect(res.body).toHaveProperty('byYear');
    expect(res.body).toHaveProperty('overall');
  });
});

describe('POST /api/bonds/transactions', () => {
  it('returns 201 with the created transaction', async () => {
    mockStore.addTransaction.mockResolvedValue({ id: 'abc', ...DEPOSIT });

    const res = await request(app)
      .post('/api/bonds/transactions')
      .set(bearer)
      .send(DEPOSIT)
      .expect(201);

    expect(res.body).toMatchObject({ id: 'abc', type: 'deposit', amount: 1000 });
  });
});

describe('GET /api/bonds/transactions', () => {
  it('returns stored transactions', async () => {
    mockStore.getTransactions.mockResolvedValue([{ id: 'abc', ...DEPOSIT }]);

    const res = await request(app).get('/api/bonds/transactions').set(bearer).expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 'abc', type: 'deposit' });
  });
});

describe('PUT /api/bonds/transactions/:id', () => {
  it('returns 200 with updated transaction', async () => {
    const updated = { id: 'abc', date: '2022-03', amount: 2000, type: 'deposit' as const };
    mockStore.getTransactions.mockResolvedValue([]);
    mockStore.updateTransaction.mockResolvedValue(updated);

    const res = await request(app)
      .put('/api/bonds/transactions/abc')
      .set(bearer)
      .send({ date: '2022-03', amount: 2000, type: 'deposit' })
      .expect(200);

    expect(res.body).toMatchObject({ id: 'abc', amount: 2000 });
  });
});

describe('DELETE /api/bonds/transactions/:id', () => {
  it('returns 204 when transaction is deleted', async () => {
    mockStore.removeTransaction.mockResolvedValue(true);
    await request(app).delete('/api/bonds/transactions/abc').set(bearer).expect(204);
  });
});

describe('POST /api/bonds/prizes', () => {
  it('returns 201 with the created prize', async () => {
    mockStore.getTransactions.mockResolvedValue([{ id: '1', ...DEPOSIT }]);
    mockStore.addPrize.mockResolvedValue({ id: 'xyz', ...PRIZE });

    const res = await request(app)
      .post('/api/bonds/prizes')
      .set(bearer)
      .send(PRIZE)
      .expect(201);

    expect(res.body).toMatchObject({ id: 'xyz', amount: 25 });
  });
});

describe('GET /api/bonds/prizes', () => {
  it('returns stored prizes', async () => {
    mockStore.getPrizes.mockResolvedValue([{ id: 'xyz', ...PRIZE }]);

    const res = await request(app).get('/api/bonds/prizes').set(bearer).expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 'xyz', amount: 25 });
  });
});

describe('PUT /api/bonds/prizes/:id', () => {
  it('returns 200 with updated prize', async () => {
    mockStore.getTransactions.mockResolvedValue([{ id: '1', ...DEPOSIT }]);
    mockStore.updatePrize.mockResolvedValue({ id: 'xyz', date: '2022-09', amount: 50 });

    const res = await request(app)
      .put('/api/bonds/prizes/xyz')
      .set(bearer)
      .send({ date: '2022-09', amount: 50 })
      .expect(200);

    expect(res.body).toMatchObject({ id: 'xyz', amount: 50 });
  });
});

describe('DELETE /api/bonds/prizes/:id', () => {
  it('returns 204 when prize is deleted', async () => {
    mockStore.removePrize.mockResolvedValue(true);
    await request(app).delete('/api/bonds/prizes/xyz').set(bearer).expect(204);
  });
});

describe('POST /api/users/register', () => {
  it('returns 201 with id and email on success', async () => {
    mockUsers.findUserByEmail.mockResolvedValue(null);
    mockUsers.createUser.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hashed',
      createdAt: new Date(),
    });

    const res = await request(app)
      .post('/api/users/register')
      .send({ email: 'user@example.com', password: 'password123' })
      .expect(201);

    expect(res.body).toMatchObject({ id: 'user-1', email: 'user@example.com' });
    expect(res.body).not.toHaveProperty('passwordHash');
  });
});

describe('POST /api/users/login', () => {
  it('returns 200 with token on valid credentials', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bcrypt = require('bcrypt') as { hash: (data: string, rounds: number) => Promise<string> };
    const passwordHash = await bcrypt.hash('password123', 1);

    mockUsers.findUserByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash,
      createdAt: new Date(),
    });

    const res = await request(app)
      .post('/api/users/login')
      .send({ email: 'user@example.com', password: 'password123' })
      .expect(200);

    expect(res.body).toMatchObject({ id: 'user-1', email: 'user@example.com' });
    expect(res.body).toHaveProperty('token');
  });
});

describe('GET /api/users', () => {
  it('returns all users with activity', async () => {
    mockUsers.getAllUsersWithActivity.mockResolvedValue([
      { id: 'user-1', email: 'user@example.com', createdAt: new Date(), premiumBonds: { transactions: [], prizes: [] } },
    ]);

    const res = await request(app).get('/api/users').set(bearer).expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 'user-1', email: 'user@example.com' });
    expect(res.body[0]).not.toHaveProperty('passwordHash');
  });
});

describe('GET /api/users/:id', () => {
  it('returns a user with activity', async () => {
    mockUsers.findUserWithActivity.mockResolvedValue({
      id: 'user-1', email: 'user@example.com', createdAt: new Date(), premiumBonds: { transactions: [], prizes: [] },
    });

    const res = await request(app).get('/api/users/user-1').set(bearer).expect(200);
    expect(res.body).toMatchObject({ id: 'user-1', email: 'user@example.com' });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('returns 404 when user does not exist', async () => {
    mockUsers.findUserWithActivity.mockResolvedValue(null);

    const res = await request(app).get('/api/users/bad-id').set(bearer).expect(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

describe('DELETE /api/users/me', () => {
  it('returns 204 when account is deleted', async () => {
    mockUsers.deleteUser.mockResolvedValue(true);
    await request(app).delete('/api/users/me').set(bearer).expect(204);
  });
});

describe('unknown routes', () => {
  it('returns 404 for unrecognised endpoints', async () => {
    const res = await request(app).get('/api/nonexistent').expect(404);
    expect(res.body.error).toBe('Not found');
  });
});

// One 500 test is sufficient — all controllers use the same next(err) pattern and
// the Express error handler is a single function, so this proves it for all routes.
describe('500 error handling', () => {
  it('returns 500 when the store throws unexpectedly', async () => {
    mockStore.getTransactions.mockRejectedValue(new Error('Unexpected DB failure'));

    const res = await request(app).get('/api/bonds/transactions').set(bearer).expect(500);
    expect(res.body.error).toBe('Internal server error');
  });
});
