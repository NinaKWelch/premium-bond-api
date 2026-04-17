import type { Request, Response, NextFunction } from 'express';
import { list, add, update, remove } from '../prizes.controller';
import type { AuthenticatedRequest } from '../../middleware/auth';

jest.mock('../../store/store', () => ({
  getTransactions: jest.fn(),
  getPrizes: jest.fn(),
  addPrize: jest.fn(),
  updatePrize: jest.fn(),
  removePrize: jest.fn(),
}));

import { getTransactions, getPrizes, addPrize, updatePrize, removePrize } from '../../store/store';
const mockGetTransactions = jest.mocked(getTransactions);
const mockGetPrizes = jest.mocked(getPrizes);
const mockAddPrize = jest.mocked(addPrize);
const mockUpdatePrize = jest.mocked(updatePrize);
const mockRemovePrize = jest.mocked(removePrize);

const USER_ID = 'user-1';
const DEPOSIT = { id: '1', date: '2022-01', amount: 1000, type: 'deposit' as const };
const PRIZE = { id: '2', date: '2022-06', amount: 25 };

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
  it('returns prizes for the authenticated user', async () => {
    mockGetPrizes.mockResolvedValue([PRIZE]);

    const res = makeRes();
    await list(makeReq(), res, next);

    expect(mockGetPrizes).toHaveBeenCalledWith(USER_ID);
    expect(res.json).toHaveBeenCalledWith([PRIZE]);
  });

  it('calls next with error when store throws', async () => {
    const err = new Error('DB failure');
    mockGetPrizes.mockRejectedValue(err);

    await list(makeReq(), makeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

// ---------------------------------------------------------------------------
// add
// ---------------------------------------------------------------------------

describe('add', () => {
  it('creates and returns the prize', async () => {
    mockGetTransactions.mockResolvedValue([DEPOSIT]);
    mockAddPrize.mockResolvedValue(PRIZE);

    const res = makeRes();
    await add(makeReq({ body: { date: '2022-06', amount: 25 } }), res, next);

    expect(mockAddPrize).toHaveBeenCalledWith(USER_ID, { date: '2022-06', amount: 25 });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(PRIZE);
  });

  it('returns 400 for invalid body', async () => {
    const res = makeRes();
    await add(makeReq({ body: { date: '2022-06' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockAddPrize).not.toHaveBeenCalled();
  });

  it('returns 400 when no deposits exist', async () => {
    mockGetTransactions.mockResolvedValue([]);

    const res = makeRes();
    await add(makeReq({ body: { date: '2022-06', amount: 25 } }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringMatching(/no deposits/i) });
    expect(mockAddPrize).not.toHaveBeenCalled();
  });

  it('returns 400 when prize is in the same month as first deposit', async () => {
    mockGetTransactions.mockResolvedValue([
      { id: '1', date: '2022-06', amount: 1000, type: 'deposit' },
    ]);

    const res = makeRes();
    await add(makeReq({ body: { date: '2022-06', amount: 25 } }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringMatching(/later month/i) });
    expect(mockAddPrize).not.toHaveBeenCalled();
  });

  it('calls next with error when store throws', async () => {
    const err = new Error('DB failure');
    mockGetTransactions.mockResolvedValue([DEPOSIT]);
    mockAddPrize.mockRejectedValue(err);

    await add(makeReq({ body: { date: '2022-06', amount: 25 } }), makeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

describe('update', () => {
  it('updates and returns the prize', async () => {
    const updated = { ...PRIZE, amount: 50 };
    mockGetTransactions.mockResolvedValue([DEPOSIT]);
    mockUpdatePrize.mockResolvedValue(updated);

    const res = makeRes();
    await update(makeReq({ params: { id: '2' }, body: { date: '2022-06', amount: 50 } }), res, next);

    expect(mockUpdatePrize).toHaveBeenCalledWith('2', USER_ID, { date: '2022-06', amount: 50 });
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  it('returns 404 when prize does not exist', async () => {
    mockGetTransactions.mockResolvedValue([DEPOSIT]);
    mockUpdatePrize.mockResolvedValue(null);

    const res = makeRes();
    await update(makeReq({ params: { id: 'bad' }, body: { date: '2022-06', amount: 25 } }), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringMatching(/not found/i) });
  });

  it('returns 400 for invalid body', async () => {
    const res = makeRes();
    await update(makeReq({ params: { id: '2' }, body: { amount: 25 } }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockUpdatePrize).not.toHaveBeenCalled();
  });

  it('calls next with error when store throws', async () => {
    const err = new Error('DB failure');
    mockGetTransactions.mockResolvedValue([DEPOSIT]);
    mockUpdatePrize.mockRejectedValue(err);

    await update(makeReq({ params: { id: '2' }, body: { date: '2022-06', amount: 25 } }), makeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

// ---------------------------------------------------------------------------
// remove
// ---------------------------------------------------------------------------

describe('remove', () => {
  it('returns 204 when prize is deleted', async () => {
    mockRemovePrize.mockResolvedValue(true);

    const res = makeRes();
    await remove(makeReq({ params: { id: '2' } }), res, next);

    expect(mockRemovePrize).toHaveBeenCalledWith('2', USER_ID);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it('returns 404 when prize does not exist', async () => {
    mockRemovePrize.mockResolvedValue(false);

    const res = makeRes();
    await remove(makeReq({ params: { id: 'bad' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringMatching(/not found/i) });
  });

  it('calls next with error when store throws', async () => {
    const err = new Error('DB failure');
    mockRemovePrize.mockRejectedValue(err);

    await remove(makeReq({ params: { id: '2' } }), makeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
