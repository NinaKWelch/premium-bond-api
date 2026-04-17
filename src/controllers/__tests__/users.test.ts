import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { register, login, listUsers, getUser, deleteAccount } from '../users.controller';

jest.mock('../../store/users', () => ({
  createUser: jest.fn(),
  findUserByEmail: jest.fn(),
  getAllUsersWithActivity: jest.fn(),
  findUserWithActivity: jest.fn(),
  deleteUser: jest.fn(),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import { createUser, findUserByEmail, getAllUsersWithActivity, findUserWithActivity, deleteUser } from '../../store/users';
const mockCreateUser = jest.mocked(createUser);
const mockFindUserByEmail = jest.mocked(findUserByEmail);
const mockGetAllUsersWithActivity = jest.mocked(getAllUsersWithActivity);
const mockFindUserWithActivity = jest.mocked(findUserWithActivity);
const mockDeleteUser = jest.mocked(deleteUser);
const mockHash = jest.mocked(bcrypt.hash);
const mockCompare = jest.mocked(bcrypt.compare);

const TEST_SECRET = 'test-secret';
const STORED_USER = { id: 'user-1', email: 'user@example.com', passwordHash: 'hashed', createdAt: new Date() };

const makeReq = (body: object): Request => ({ body } as unknown as Request);

const makeRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
};

const next = jest.fn() as NextFunction;

beforeEach(() => {
  jest.clearAllMocks();
  process.env['JWT_SECRET'] = TEST_SECRET;
});

afterEach(() => {
  delete process.env['JWT_SECRET'];
});

// ---------------------------------------------------------------------------
// register
// ---------------------------------------------------------------------------

describe('register', () => {
  it('creates a user and returns 201 with id and email', async () => {
    mockFindUserByEmail.mockResolvedValue(null);
    mockHash.mockImplementation(async () => 'hashed');
    mockCreateUser.mockResolvedValue(STORED_USER);

    const res = makeRes();
    await register(makeReq({ email: 'user@example.com', password: 'password123' }), res, next);

    expect(mockCreateUser).toHaveBeenCalledWith('user@example.com', 'hashed');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 'user-1', email: 'user@example.com' });
  });

  it('returns 409 when email is already registered', async () => {
    mockFindUserByEmail.mockResolvedValue(STORED_USER);

    const res = makeRes();
    await register(makeReq({ email: 'user@example.com', password: 'password123' }), res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringMatching(/already exists/i) });
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid body', async () => {
    const res = makeRes();
    await register(makeReq({ email: 'not-an-email', password: 'short' }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockFindUserByEmail).not.toHaveBeenCalled();
  });

  it('calls next with error when store throws', async () => {
    const err = new Error('DB failure');
    mockFindUserByEmail.mockRejectedValue(err);

    await register(makeReq({ email: 'user@example.com', password: 'password123' }), makeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------

describe('login', () => {
  it('returns user and token on valid credentials', async () => {
    mockFindUserByEmail.mockResolvedValue(STORED_USER);
    mockCompare.mockImplementation(async () => true);

    const res = makeRes();
    await login(makeReq({ email: 'user@example.com', password: 'password123' }), res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1', email: 'user@example.com', token: expect.any(String) }),
    );
  });

  it('returns 401 when user does not exist', async () => {
    mockFindUserByEmail.mockResolvedValue(null);

    const res = makeRes();
    await login(makeReq({ email: 'unknown@example.com', password: 'password123' }), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringMatching(/invalid email or password/i) });
  });

  it('returns 401 when password does not match', async () => {
    mockFindUserByEmail.mockResolvedValue(STORED_USER);
    mockCompare.mockImplementation(async () => false);

    const res = makeRes();
    await login(makeReq({ email: 'user@example.com', password: 'wrong' }), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringMatching(/invalid email or password/i) });
  });

  it('returns 400 for invalid body', async () => {
    const res = makeRes();
    await login(makeReq({ email: 'not-an-email' }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockFindUserByEmail).not.toHaveBeenCalled();
  });

  it('returns 500 when JWT_SECRET is not set', async () => {
    delete process.env['JWT_SECRET'];
    mockFindUserByEmail.mockResolvedValue(STORED_USER);
    mockCompare.mockImplementation(async () => true);

    const res = makeRes();
    await login(makeReq({ email: 'user@example.com', password: 'password123' }), res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Server misconfiguration' });
  });

  it('calls next with error when store throws', async () => {
    const err = new Error('DB failure');
    mockFindUserByEmail.mockRejectedValue(err);

    await login(makeReq({ email: 'user@example.com', password: 'password123' }), makeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

const USER_WITH_ACTIVITY = {
  id: 'user-1',
  email: 'user@example.com',
  createdAt: new Date(),
  premiumBonds: {
    transactions: [{ id: 't1', date: '2022-01', amount: 1000, type: 'deposit' as const }],
    prizes: [{ id: 'p1', date: '2022-06', amount: 25 }],
  },
};

// ---------------------------------------------------------------------------
// listUsers
// ---------------------------------------------------------------------------

describe('listUsers', () => {
  it('returns all users with activity', async () => {
    mockGetAllUsersWithActivity.mockResolvedValue([USER_WITH_ACTIVITY]);

    const res = makeRes();
    await listUsers({} as Request, res, next);

    expect(res.json).toHaveBeenCalledWith([USER_WITH_ACTIVITY]);
    expect(next).not.toHaveBeenCalled();
  });

  it('does not expose passwordHash', async () => {
    mockGetAllUsersWithActivity.mockResolvedValue([USER_WITH_ACTIVITY]);

    const res = makeRes();
    await listUsers({} as Request, res, next);

    const [users] = (res.json as jest.Mock).mock.calls[0] as [typeof USER_WITH_ACTIVITY[]];
    expect(users[0]).not.toHaveProperty('passwordHash');
  });

  it('calls next with error when store throws', async () => {
    const err = new Error('DB failure');
    mockGetAllUsersWithActivity.mockRejectedValue(err);

    await listUsers({} as Request, makeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

// ---------------------------------------------------------------------------
// getUser
// ---------------------------------------------------------------------------

describe('getUser', () => {
  it('returns a user with activity', async () => {
    mockFindUserWithActivity.mockResolvedValue(USER_WITH_ACTIVITY);

    const req = { params: { id: 'user-1' } } as unknown as Request;
    const res = makeRes();
    await getUser(req, res, next);

    expect(mockFindUserWithActivity).toHaveBeenCalledWith('user-1');
    expect(res.json).toHaveBeenCalledWith(USER_WITH_ACTIVITY);
  });

  it('does not expose passwordHash', async () => {
    mockFindUserWithActivity.mockResolvedValue(USER_WITH_ACTIVITY);

    const req = { params: { id: 'user-1' } } as unknown as Request;
    const res = makeRes();
    await getUser(req, res, next);

    const [user] = (res.json as jest.Mock).mock.calls[0] as [typeof USER_WITH_ACTIVITY];
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('returns 404 when user does not exist', async () => {
    mockFindUserWithActivity.mockResolvedValue(null);

    const req = { params: { id: 'bad-id' } } as unknown as Request;
    const res = makeRes();
    await getUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('calls next with error when store throws', async () => {
    const err = new Error('DB failure');
    mockFindUserWithActivity.mockRejectedValue(err);

    await getUser({ params: { id: 'user-1' } } as unknown as Request, makeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

// ---------------------------------------------------------------------------
// deleteAccount
// ---------------------------------------------------------------------------

describe('deleteAccount', () => {
  it('deletes the authenticated user and returns 204', async () => {
    mockDeleteUser.mockResolvedValue(true);

    const req = { userId: 'user-1' } as unknown as Request;
    const res = makeRes();
    await deleteAccount(req, res, next);

    expect(mockDeleteUser).toHaveBeenCalledWith('user-1');
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it('calls next with error when store throws', async () => {
    const err = new Error('DB failure');
    mockDeleteUser.mockRejectedValue(err);

    await deleteAccount({ userId: 'user-1' } as unknown as Request, makeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
