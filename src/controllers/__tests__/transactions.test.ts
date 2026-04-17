import type { Request, Response, NextFunction } from 'express';
import { list, add, update, remove } from '../transactions.controller';
import type { AuthenticatedRequest } from '../../middleware/auth';

jest.mock('../../store/store', () => ({
  getTransactions: jest.fn(),
  addTransaction: jest.fn(),
  updateTransaction: jest.fn(),
  removeTransaction: jest.fn(),
}));

import { getTransactions, addTransaction, updateTransaction, removeTransaction } from '../../store/store';
const mockGetTransactions = jest.mocked(getTransactions);
const mockAddTransaction = jest.mocked(addTransaction);
const mockUpdateTransaction = jest.mocked(updateTransaction);
const mockRemoveTransaction = jest.mocked(removeTransaction);

const USER_ID = 'user-1';
const DEPOSIT = { id: '1', date: '2022-01', amount: 1000, type: 'deposit' as const };

const makeReq = (overrides: Partial<AuthenticatedRequest> = {}): Request =>
  ({ userId: USER_ID, body: {}, params: {}, ...overrides } as unknown as AuthenticatedRequest);

const makeRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  
  return res as unknown as Response;
};

const next = jest.fn() as NextFunction;

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------

describe('list', () => {
  it('returns transactions for the authenticated user', async () => {
    mockGetTransactions.mockResolvedValue([DEPOSIT]);

    const res = makeRes();
    await list(makeReq(), res, next);

    expect(mockGetTransactions).toHaveBeenCalledWith(USER_ID);
    expect(res.json).toHaveBeenCalledWith([DEPOSIT]);
  });

  it('calls next with error when store throws', async () => {
    const err = new Error('DB failure');
    mockGetTransactions.mockRejectedValue(err);

    await list(makeReq(), makeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

// ---------------------------------------------------------------------------
// add
// ---------------------------------------------------------------------------

describe('add', () => {
  it('creates and returns the transaction', async () => {
    mockAddTransaction.mockResolvedValue(DEPOSIT);

    const res = makeRes();
    await add(makeReq({ body: { date: '2022-01', amount: 1000, type: 'deposit' } }), res, next);

    expect(mockAddTransaction).toHaveBeenCalledWith(USER_ID, { date: '2022-01', amount: 1000, type: 'deposit' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(DEPOSIT);
  });

  it('returns 400 for invalid body', async () => {
    const res = makeRes();
    await add(makeReq({ body: { date: '2022-01' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockAddTransaction).not.toHaveBeenCalled();
  });

  it('returns 400 when withdrawal would exceed balance', async () => {
    mockGetTransactions.mockResolvedValue([
      { id: '1', date: '2022-01', amount: 500, type: 'deposit' },
    ]);

    const res = makeRes();
    await add(makeReq({ body: { date: '2022-06', amount: 1000, type: 'withdrawal' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringMatching(/exceed/i) });
    expect(mockAddTransaction).not.toHaveBeenCalled();
  });

  it('calls next with error when store throws', async () => {
    const err = new Error('DB failure');
    mockAddTransaction.mockRejectedValue(err);

    await add(makeReq({ body: { date: '2022-01', amount: 1000, type: 'deposit' } }), makeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

describe('update', () => {
  it('updates and returns the transaction', async () => {
    const updated = { ...DEPOSIT, amount: 2000 };
    mockGetTransactions.mockResolvedValue([]);
    mockUpdateTransaction.mockResolvedValue(updated);

    const res = makeRes();
    await update(makeReq({ params: { id: '1' }, body: { date: '2022-01', amount: 2000, type: 'deposit' } }), res, next);

    expect(mockUpdateTransaction).toHaveBeenCalledWith('1', USER_ID, { date: '2022-01', amount: 2000, type: 'deposit' });
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  it('returns 404 when transaction does not exist', async () => {
    mockGetTransactions.mockResolvedValue([]);
    mockUpdateTransaction.mockResolvedValue(null);

    const res = makeRes();
    await update(makeReq({ params: { id: 'bad' }, body: { date: '2022-01', amount: 1000, type: 'deposit' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringMatching(/not found/i) });
  });

  it('returns 400 for invalid body', async () => {
    const res = makeRes();
    await update(makeReq({ params: { id: '1' }, body: { date: 'bad-date' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockUpdateTransaction).not.toHaveBeenCalled();
  });

  it('calls next with error when store throws', async () => {
    const err = new Error('DB failure');
    mockGetTransactions.mockResolvedValue([]);
    mockUpdateTransaction.mockRejectedValue(err);

    await update(makeReq({ params: { id: '1' }, body: { date: '2022-01', amount: 1000, type: 'deposit' } }), makeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

// ---------------------------------------------------------------------------
// remove
// ---------------------------------------------------------------------------

describe('remove', () => {
  it('returns 204 when transaction is deleted', async () => {
    mockRemoveTransaction.mockResolvedValue(true);

    const res = makeRes();
    await remove(makeReq({ params: { id: '1' } }), res, next);

    expect(mockRemoveTransaction).toHaveBeenCalledWith('1', USER_ID);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it('returns 404 when transaction does not exist', async () => {
    mockRemoveTransaction.mockResolvedValue(false);

    const res = makeRes();
    await remove(makeReq({ params: { id: 'bad' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringMatching(/not found/i) });
  });

  it('calls next with error when store throws', async () => {
    const err = new Error('DB failure');
    mockRemoveTransaction.mockRejectedValue(err);

    await remove(makeReq({ params: { id: '1' } }), makeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
