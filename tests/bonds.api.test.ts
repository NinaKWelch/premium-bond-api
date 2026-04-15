import request from 'supertest';
import app from '../src/app';
import * as store from '../src/store/store';

// Isolate tests from the real store file
jest.mock('../src/store/store');
const mockStore = store as jest.Mocked<typeof store>;

const DEPOSIT = { date: '2022-01-01', amount: 1000, type: 'deposit' as const };
const PRIZE = { date: '2022-06-01', amount: 25 };

beforeEach(() => jest.clearAllMocks());

describe('GET /api/bonds/calculate', () => {
  it('returns 200 with calculation when store has data', async () => {
    mockStore.getAll.mockReturnValue({
      transactions: [{ id: '1', ...DEPOSIT }],
      prizes: [{ id: '1', ...PRIZE }],
    });

    const res = await request(app).get('/api/bonds/calculate').expect(200);
    expect(res.body).toHaveProperty('byYear');
    expect(res.body).toHaveProperty('overall');
    expect(res.body.byYear[0]).toMatchObject({
      year: 2022,
      prizesWon: 25,
    });
  });

  it('returns 400 when no deposits are stored', async () => {
    mockStore.getAll.mockReturnValue({ transactions: [], prizes: [] });

    const res = await request(app).get('/api/bonds/calculate').expect(400);
    expect(res.body.error).toMatch(/no deposits/i);
  });
});

describe('POST /api/bonds/transactions', () => {
  it('returns 201 with the created transaction', async () => {
    mockStore.addTransaction.mockReturnValue({ id: 'abc', ...DEPOSIT });

    const res = await request(app)
      .post('/api/bonds/transactions')
      .send(DEPOSIT)
      .expect(201);

    expect(res.body).toMatchObject({ id: 'abc', type: 'deposit', amount: 1000 });
  });

  it('returns 400 for missing type', async () => {
    const res = await request(app)
      .post('/api/bonds/transactions')
      .send({ date: '2022-01-01', amount: 1000 })
      .expect(400);

    expect(res.body.details.fieldErrors).toHaveProperty('type');
  });

  it('returns 400 for negative amount', async () => {
    const res = await request(app)
      .post('/api/bonds/transactions')
      .send({ date: '2022-01-01', amount: -500, type: 'deposit' })
      .expect(400);

    expect(res.body.details.fieldErrors).toHaveProperty('amount');
  });

  it('returns 400 for invalid date format', async () => {
    const res = await request(app)
      .post('/api/bonds/transactions')
      .send({ date: '01-01-2022', amount: 1000, type: 'deposit' })
      .expect(400);

    expect(res.body.details.fieldErrors).toHaveProperty('date');
  });

  it('returns 400 when withdrawal would exceed balance', async () => {
    mockStore.getTransactions.mockReturnValue([
      { id: '1', date: '2022-01-01', amount: 500, type: 'deposit' },
    ]);

    const res = await request(app)
      .post('/api/bonds/transactions')
      .send({ date: '2022-06-01', amount: 1000, type: 'withdrawal' })
      .expect(400);

    expect(res.body.error).toMatch(/exceed/i);
  });

  it('returns 201 when withdrawal is within balance', async () => {
    mockStore.getTransactions.mockReturnValue([
      { id: '1', date: '2022-01-01', amount: 1000, type: 'deposit' },
    ]);
    mockStore.addTransaction.mockReturnValue({
      id: '2', date: '2022-06-01', amount: 500, type: 'withdrawal',
    });

    await request(app)
      .post('/api/bonds/transactions')
      .send({ date: '2022-06-01', amount: 500, type: 'withdrawal' })
      .expect(201);
  });
});

describe('GET /api/bonds/transactions', () => {
  it('returns stored transactions', async () => {
    mockStore.getTransactions.mockReturnValue([{ id: 'abc', ...DEPOSIT }]);

    const res = await request(app).get('/api/bonds/transactions').expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 'abc', type: 'deposit' });
  });

  it('returns empty array when no transactions stored', async () => {
    mockStore.getTransactions.mockReturnValue([]);

    const res = await request(app).get('/api/bonds/transactions').expect(200);
    expect(res.body).toEqual([]);
  });
});

describe('PUT /api/bonds/transactions/:id', () => {
  it('returns 200 with updated transaction', async () => {
    const updated = { id: 'abc', date: '2022-03-01', amount: 2000, type: 'deposit' as const };
    mockStore.updateTransaction.mockReturnValue(updated);

    const res = await request(app)
      .put('/api/bonds/transactions/abc')
      .send({ date: '2022-03-01', amount: 2000, type: 'deposit' })
      .expect(200);

    expect(res.body).toMatchObject({ id: 'abc', amount: 2000 });
  });

  it('returns 404 when transaction does not exist', async () => {
    mockStore.updateTransaction.mockReturnValue(null);

    const res = await request(app)
      .put('/api/bonds/transactions/bad-id')
      .send(DEPOSIT)
      .expect(404);

    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 400 for invalid body', async () => {
    const res = await request(app)
      .put('/api/bonds/transactions/abc')
      .send({ date: '2022-01-01', amount: -100, type: 'deposit' })
      .expect(400);

    expect(res.body.details.fieldErrors).toHaveProperty('amount');
  });

  it('returns 400 when update would cause balance to go negative', async () => {
    // Existing: £1000 deposit + £500 withdrawal. Changing deposit to £400
    // would leave the withdrawal uncovered.
    mockStore.getTransactions.mockReturnValue([
      { id: 'abc', date: '2022-01-01', amount: 1000, type: 'deposit' },
      { id: 'def', date: '2022-06-01', amount: 500, type: 'withdrawal' },
    ]);

    const res = await request(app)
      .put('/api/bonds/transactions/abc')
      .send({ date: '2022-01-01', amount: 400, type: 'deposit' })
      .expect(400);

    expect(res.body.error).toMatch(/negative/i);
  });
});

describe('DELETE /api/bonds/transactions/:id', () => {
  it('returns 204 when transaction is deleted', async () => {
    mockStore.removeTransaction.mockReturnValue(true);
    await request(app).delete('/api/bonds/transactions/abc').expect(204);
  });

  it('returns 404 when transaction does not exist', async () => {
    mockStore.removeTransaction.mockReturnValue(false);
    const res = await request(app).delete('/api/bonds/transactions/bad-id').expect(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

describe('POST /api/bonds/prizes', () => {
  it('returns 201 with the created prize when date is after first deposit month', async () => {
    mockStore.getTransactions.mockReturnValue([
      { id: '1', date: '2022-01-01', amount: 1000, type: 'deposit' },
    ]);
    mockStore.addPrize.mockReturnValue({ id: 'xyz', ...PRIZE });

    const res = await request(app)
      .post('/api/bonds/prizes')
      .send(PRIZE) // PRIZE date is 2022-06-01, deposit is 2022-01-01
      .expect(201);

    expect(res.body).toMatchObject({ id: 'xyz', amount: 25 });
  });

  it('returns 400 when prize is in the same month as the first deposit', async () => {
    mockStore.getTransactions.mockReturnValue([
      { id: '1', date: '2022-06-01', amount: 1000, type: 'deposit' },
    ]);

    const res = await request(app)
      .post('/api/bonds/prizes')
      .send({ date: '2022-06-15', amount: 25 })
      .expect(400);

    expect(res.body.error).toMatch(/later month/i);
  });

  it('returns 400 when no deposits exist', async () => {
    mockStore.getTransactions.mockReturnValue([]);

    const res = await request(app)
      .post('/api/bonds/prizes')
      .send(PRIZE)
      .expect(400);

    expect(res.body.error).toMatch(/no deposits/i);
  });

  it('returns 400 for missing amount', async () => {
    const res = await request(app)
      .post('/api/bonds/prizes')
      .send({ date: '2022-06-01' })
      .expect(400);

    expect(res.body.details.fieldErrors).toHaveProperty('amount');
  });
});

describe('GET /api/bonds/prizes', () => {
  it('returns stored prizes', async () => {
    mockStore.getPrizes.mockReturnValue([{ id: 'xyz', ...PRIZE }]);

    const res = await request(app).get('/api/bonds/prizes').expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 'xyz', amount: 25 });
  });

  it('returns empty array when no prizes stored', async () => {
    mockStore.getPrizes.mockReturnValue([]);

    const res = await request(app).get('/api/bonds/prizes').expect(200);
    expect(res.body).toEqual([]);
  });
});

describe('PUT /api/bonds/prizes/:id', () => {
  it('returns 200 with updated prize', async () => {
    mockStore.getTransactions.mockReturnValue([
      { id: '1', date: '2022-01-01', amount: 1000, type: 'deposit' },
    ]);
    const updated = { id: 'xyz', date: '2022-09-01', amount: 50 };
    mockStore.updatePrize.mockReturnValue(updated);

    const res = await request(app)
      .put('/api/bonds/prizes/xyz')
      .send({ date: '2022-09-01', amount: 50 })
      .expect(200);

    expect(res.body).toMatchObject({ id: 'xyz', amount: 50 });
  });

  it('returns 404 when prize does not exist', async () => {
    mockStore.getTransactions.mockReturnValue([
      { id: '1', date: '2022-01-01', amount: 1000, type: 'deposit' },
    ]);
    mockStore.updatePrize.mockReturnValue(null);

    const res = await request(app)
      .put('/api/bonds/prizes/bad-id')
      .send(PRIZE)
      .expect(404);

    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 400 for invalid body', async () => {
    const res = await request(app)
      .put('/api/bonds/prizes/xyz')
      .send({ date: 'not-a-date', amount: 25 })
      .expect(400);

    expect(res.body.details.fieldErrors).toHaveProperty('date');
  });
});

describe('DELETE /api/bonds/prizes/:id', () => {
  it('returns 204 when prize is deleted', async () => {
    mockStore.removePrize.mockReturnValue(true);
    await request(app).delete('/api/bonds/prizes/xyz').expect(204);
  });

  it('returns 404 when prize does not exist', async () => {
    mockStore.removePrize.mockReturnValue(false);
    const res = await request(app).delete('/api/bonds/prizes/bad-id').expect(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

describe('unknown routes', () => {
  it('returns 404 for unrecognised endpoints', async () => {
    const res = await request(app).get('/api/nonexistent').expect(404);
    expect(res.body.error).toBe('Not found');
  });
});
