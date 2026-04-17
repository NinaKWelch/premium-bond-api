import jwt from 'jsonwebtoken';
import { requireAuth, type AuthenticatedRequest } from '../auth';
import type { Request, Response, NextFunction } from 'express';

const SECRET = 'test-secret';

const makeReq = (authHeader?: string): Request =>
  ({ headers: { authorization: authHeader } }) as unknown as Request;

const makeRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
};

const next: NextFunction = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  process.env['JWT_SECRET'] = SECRET;
});

afterEach(() => {
  delete process.env['JWT_SECRET'];
});

describe('requireAuth', () => {
  it('calls next and sets userId when token is valid', () => {
    const token = jwt.sign({ sub: 'user-123' }, SECRET);
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as AuthenticatedRequest).userId).toBe('user-123');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header is missing', () => {
    const req = makeReq();
    const res = makeRes();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header does not start with Bearer', () => {
    const req = makeReq('Basic sometoken');
    const res = makeRes();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is expired', () => {
    const token = jwt.sign({ sub: 'user-123' }, SECRET, { expiresIn: -1 });
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is signed with wrong secret', () => {
    const token = jwt.sign({ sub: 'user-123' }, 'wrong-secret');
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is malformed', () => {
    const req = makeReq('Bearer not.a.jwt');
    const res = makeRes();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 500 when JWT_SECRET is not configured', () => {
    delete process.env['JWT_SECRET'];
    const token = jwt.sign({ sub: 'user-123' }, SECRET);
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Server misconfiguration' });
    expect(next).not.toHaveBeenCalled();
  });
});
