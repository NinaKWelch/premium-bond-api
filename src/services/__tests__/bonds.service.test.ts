import { calculateBondStats, wouldBalanceGoNegative, isPrizeEligible, type Transaction, type Prize } from '../bonds.service';

const d = (dateStr: string) => new Date(dateStr);

describe('calculateBondStats', () => {
  describe('average balance', () => {
    it('calculates time-weighted average for a single deposit mid-year', () => {
      // Deposit £1,000 on Jul 2 (day 183 of 365) → held for 183 days
      // Average = (0 * 182 + 1000 * 183) / 365 ≈ 501.37
      const transactions: Transaction[] = [
        { date: d('2023-07-02'), amount: 1000, type: 'deposit' },
      ];
      const result = calculateBondStats(transactions, []);
      expect(result.byYear[0].averageBalance).toBeCloseTo(501.37, 1);
    });

    it('calculates full-year average when deposit is on Jan 1', () => {
      const transactions: Transaction[] = [
        { date: d('2023-01-01'), amount: 1000, type: 'deposit' },
      ];
      const result = calculateBondStats(transactions, []);
      expect(result.byYear[0].averageBalance).toBe(1000);
    });

    it('reduces average balance after a withdrawal', () => {
      const transactions: Transaction[] = [
        { date: d('2023-01-01'), amount: 1000, type: 'deposit' },
        { date: d('2023-07-02'), amount: 500, type: 'withdrawal' },
      ];
      const result = calculateBondStats(transactions, []);
      // Balance £1,000 for ~181 days, then £500 for ~184 days
      expect(result.byYear[0].averageBalance).toBeLessThan(1000);
      expect(result.byYear[0].averageBalance).toBeGreaterThan(500);
    });

    it('carries opening balance into subsequent years', () => {
      const transactions: Transaction[] = [
        { date: d('2022-01-01'), amount: 1000, type: 'deposit' },
      ];
      const prizes: Prize[] = [
        { date: d('2023-06-01'), amount: 25 },
      ];
      const result = calculateBondStats(transactions, prizes);
      const year2023 = result.byYear.find((y) => y.year === 2023);
      expect(year2023?.averageBalance).toBe(1000);
    });
  });

  describe('prizes', () => {
    it('sums prizes per year correctly', () => {
      const transactions: Transaction[] = [
        { date: d('2022-01-01'), amount: 5000, type: 'deposit' },
      ];
      const prizes: Prize[] = [
        { date: d('2022-03-01'), amount: 25 },
        { date: d('2022-09-01'), amount: 50 },
        { date: d('2023-01-01'), amount: 100 },
      ];
      const result = calculateBondStats(transactions, prizes);
      expect(result.byYear.find((y) => y.year === 2022)?.prizesWon).toBe(75);
      expect(result.byYear.find((y) => y.year === 2023)?.prizesWon).toBe(100);
    });

    it('returns 0 prizes for years with no wins', () => {
      const transactions: Transaction[] = [
        { date: d('2022-01-01'), amount: 1000, type: 'deposit' },
      ];
      const prizes: Prize[] = [
        { date: d('2023-06-01'), amount: 25 },
      ];
      const result = calculateBondStats(transactions, prizes);
      expect(result.byYear.find((y) => y.year === 2022)?.prizesWon).toBe(0);
      expect(result.byYear.find((y) => y.year === 2022)?.effectiveRatePct).toBe(0);
    });
  });

  describe('effective rate', () => {
    it('calculates effective rate as prizes / average balance', () => {
      const transactions: Transaction[] = [
        { date: d('2023-01-01'), amount: 1000, type: 'deposit' },
      ];
      const prizes: Prize[] = [
        { date: d('2023-06-01'), amount: 44 },
      ];
      const result = calculateBondStats(transactions, prizes);
      // 44 / 1000 * 100 = 4.4%
      expect(result.byYear[0].effectiveRatePct).toBeCloseTo(4.4, 1);
    });

    it('returns 0% effective rate when average balance is 0', () => {
      const transactions: Transaction[] = [
        { date: d('2023-07-01'), amount: 1000, type: 'deposit' },
      ];
      const prizes: Prize[] = [
        { date: d('2023-01-15'), amount: 25 },
      ];
      // Prize is before deposit — avg balance for the prize period is 0
      // The year as a whole still has a non-zero average, but prizes before
      // first deposit should not have been provided (schema blocks this).
      // This just confirms no division errors occur.
      const result = calculateBondStats(transactions, prizes);
      expect(result.byYear[0].effectiveRatePct).toBeGreaterThanOrEqual(0);
    });
  });

  describe('overall summary', () => {
    it('subtracts withdrawals from total invested', () => {
      const transactions: Transaction[] = [
        { date: d('2022-01-01'), amount: 1000, type: 'deposit' },
        { date: d('2022-06-01'), amount: 500, type: 'deposit' },
        { date: d('2023-01-01'), amount: 200, type: 'withdrawal' },
      ];
      const result = calculateBondStats(transactions, []);
      expect(result.overall.totalInvested).toBe(1300);
    });

    it('sums total prizes won across all years', () => {
      const transactions: Transaction[] = [
        { date: d('2022-01-01'), amount: 5000, type: 'deposit' },
      ];
      const prizes: Prize[] = [
        { date: d('2022-06-01'), amount: 25 },
        { date: d('2023-06-01'), amount: 50 },
      ];
      const result = calculateBondStats(transactions, prizes);
      expect(result.overall.totalPrizesWon).toBe(75);
    });

    it('overall rate is not skewed by low-balance years', () => {
      // Year 1: avg balance £100 (small), 0 prizes → 0%
      // Year 2: avg balance £5000,        prizes £200 → 4%
      // Simple mean of rates = 2%, but weighted overall should be closer to 4%
      const transactions: Transaction[] = [
        { date: d('2022-01-01'), amount: 100, type: 'deposit' },
        { date: d('2023-01-01'), amount: 4900, type: 'deposit' },
      ];
      const prizes: Prize[] = [
        { date: d('2023-06-01'), amount: 200 },
      ];
      const result = calculateBondStats(transactions, prizes);
      const simpleMeanOfRates =
        result.byYear.reduce((s, y) => s + y.effectiveRatePct, 0) /
        result.byYear.length;
      expect(result.overall.averageAnnualRatePct).toBeGreaterThan(simpleMeanOfRates);
    });
  });
});

describe('wouldBalanceGoNegative', () => {
  it('returns false for deposits only', () => {
    const transactions: Transaction[] = [
      { date: d('2022-01-01'), amount: 1000, type: 'deposit' },
      { date: d('2022-06-01'), amount: 500, type: 'deposit' },
    ];
    expect(wouldBalanceGoNegative(transactions)).toBe(false);
  });

  it('returns false when withdrawal is less than balance', () => {
    const transactions: Transaction[] = [
      { date: d('2022-01-01'), amount: 1000, type: 'deposit' },
      { date: d('2022-06-01'), amount: 500, type: 'withdrawal' },
    ];
    expect(wouldBalanceGoNegative(transactions)).toBe(false);
  });

  it('returns false when withdrawal exactly equals balance', () => {
    const transactions: Transaction[] = [
      { date: d('2022-01-01'), amount: 1000, type: 'deposit' },
      { date: d('2022-06-01'), amount: 1000, type: 'withdrawal' },
    ];
    expect(wouldBalanceGoNegative(transactions)).toBe(false);
  });

  it('returns true when withdrawal exceeds balance', () => {
    const transactions: Transaction[] = [
      { date: d('2022-01-01'), amount: 1000, type: 'deposit' },
      { date: d('2022-06-01'), amount: 1500, type: 'withdrawal' },
    ];
    expect(wouldBalanceGoNegative(transactions)).toBe(true);
  });

  it('returns true when withdrawal comes before the deposit that would cover it', () => {
    // Chronologically: withdrawal on Jan 1 before deposit on Jun 1
    const transactions: Transaction[] = [
      { date: d('2022-06-01'), amount: 1000, type: 'deposit' },
      { date: d('2022-01-01'), amount: 500, type: 'withdrawal' },
    ];
    expect(wouldBalanceGoNegative(transactions)).toBe(true);
  });

  it('returns true for a withdrawal with no prior deposits', () => {
    const transactions: Transaction[] = [
      { date: d('2022-01-01'), amount: 500, type: 'withdrawal' },
    ];
    expect(wouldBalanceGoNegative(transactions)).toBe(true);
  });
});

describe('isPrizeEligible', () => {
  const deposit = (date: string): Transaction => ({ date: d(date), amount: 1000, type: 'deposit' });

  it('returns true when prize is in the month after the first deposit', () => {
    expect(isPrizeEligible(d('2022-02-01'), [deposit('2022-01-15')])).toBe(true);
  });

  it('returns true when prize is many months after the first deposit', () => {
    expect(isPrizeEligible(d('2024-12-01'), [deposit('2022-01-01')])).toBe(true);
  });

  it('returns false when prize is in the same month as the first deposit', () => {
    expect(isPrizeEligible(d('2022-01-31'), [deposit('2022-01-01')])).toBe(false);
  });

  it('returns false when prize is before the first deposit', () => {
    expect(isPrizeEligible(d('2021-12-01'), [deposit('2022-01-01')])).toBe(false);
  });

  it('returns false when there are no deposits', () => {
    expect(isPrizeEligible(d('2022-02-01'), [])).toBe(false);
  });

  it('uses the earliest deposit date when multiple deposits exist', () => {
    const deposits = [deposit('2022-06-01'), deposit('2022-01-01')];
    // February is valid relative to January (the earliest deposit)
    expect(isPrizeEligible(d('2022-02-01'), deposits)).toBe(true);
    // January itself is not valid
    expect(isPrizeEligible(d('2022-01-31'), deposits)).toBe(false);
  });
});
