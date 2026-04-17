import type { Request, Response, NextFunction } from 'express';
import { calculate } from '../bonds.controller';
import type { AuthenticatedRequest } from '../../middleware/auth';

jest.mock('../../store/store', () => ({
  getAll: jest.fn(),
}));

import { getAll } from '../../store/store';
const mockGetAll = jest.mocked(getAll);

const USER_ID = 'user-1';

const makeReq = (userId = USER_ID): Request =>
  ({ userId } as unknown as AuthenticatedRequest);

const makeRes = () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return res as unknown as Response;
};

const next = jest.fn() as NextFunction;

beforeEach(() => jest.clearAllMocks());

describe('calculate', () => {
  it('returns calculation result when deposits exist', async () => {
    mockGetAll.mockResolvedValue({
      transactions: [{ id: '1', date: '2022-01', amount: 1000, type: 'deposit' }],
      prizes: [{ id: '2', date: '2022-06', amount: 25 }],
    });

    const res = makeRes();
    await calculate(makeReq(), res, next);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ byYear: expect.any(Array), overall: expect.any(Object) }));
    expect(next).not.toHaveBeenCalled();
  });

  it('passes userId to getAll', async () => {
    mockGetAll.mockResolvedValue({ transactions: [{ id: '1', date: '2022-01', amount: 1000, type: 'deposit' }], prizes: [] });

    await calculate(makeReq('custom-user'), makeRes(), next);

    expect(mockGetAll).toHaveBeenCalledWith('custom-user');
  });

  it('returns 400 when there are no deposits', async () => {
    mockGetAll.mockResolvedValue({ transactions: [], prizes: [] });

    const res = makeRes();
    await calculate(makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringMatching(/no deposits/i) });
  });

  it('calls next with error when store throws', async () => {
    const err = new Error('DB failure');
    mockGetAll.mockRejectedValue(err);

    await calculate(makeReq(), makeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
