export interface Transaction {
  date: Date;
  amount: number;
  type: 'deposit' | 'withdrawal';
}

export interface Prize {
  date: Date;
  amount: number;
}

export interface YearResult {
  year: number;
  amountInvested: number;
  averageBalance: number;
  prizesWon: number;
  effectiveRatePct: number;
}

export interface CalculationResult {
  byYear: YearResult[];
  overall: {
    totalInvested: number;
    totalPrizesWon: number;
    averageAnnualRatePct: number;
  };
}

/**
 * Returns true if the prize date is eligible given the deposit history.
 *
 * NS&I bonds enter the prize draw in the month AFTER they are purchased,
 * so a prize can only be won from the second calendar month onwards.
 * A prize in the same year-month as the earliest deposit is invalid.
 */
export function isPrizeEligible(prizeDate: Date, deposits: Transaction[]): boolean {
  const depositDates = deposits
    .filter((t) => t.type === 'deposit')
    .map((t) => t.date);

  if (depositDates.length === 0) return false;

  const firstDeposit = new Date(Math.min(...depositDates.map((d) => d.getTime())));

  // Prize must be in a strictly later month than the first deposit
  const prizeYearMonth = prizeDate.getFullYear() * 12 + prizeDate.getMonth();
  const depositYearMonth = firstDeposit.getFullYear() * 12 + firstDeposit.getMonth();

  return prizeYearMonth > depositYearMonth;
}

/**
 * Checks whether applying the given set of transactions would cause the
 * running balance to go negative at any point in time.
 *
 * Transactions are sorted chronologically before checking, so the order
 * in which they are passed does not matter.
 */
export function wouldBalanceGoNegative(transactions: Transaction[]): boolean {
  const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
  let balance = 0;
  for (const t of sorted) {
    balance += t.type === 'deposit' ? t.amount : -t.amount;
    if (balance < 0) return true;
  }
  return false;
}

function daysInYear(year: number): number {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365;
}

/**
 * Calculates the time-weighted average balance for a given calendar year.
 *
 * Builds a timeline of balance-change events (deposits and withdrawals) and
 * weights each balance by the number of days it was held.
 */
function averageBalanceForYear(year: number, transactions: Transaction[]): number {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);
  const totalDays = daysInYear(year);

  // Balance inherited from all transactions before this year
  const openingBalance = transactions
    .filter((t) => t.date < yearStart)
    .reduce((sum, t) => sum + (t.type === 'deposit' ? t.amount : -t.amount), 0);

  // Transactions within this year, sorted by date
  const eventsThisYear = transactions
    .filter((t) => t.date >= yearStart && t.date < yearEnd)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  let weightedSum = 0;
  let balance = openingBalance;
  let periodStart = yearStart;

  for (const event of eventsThisYear) {
    const days =
      (event.date.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
    weightedSum += balance * days;
    balance += event.type === 'deposit' ? event.amount : -event.amount;
    periodStart = event.date;
  }

  // Final period: last event (or Jan 1) through to Dec 31
  const remainingDays =
    (yearEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
  weightedSum += balance * remainingDays;

  return Number((weightedSum / totalDays).toFixed(2));
}

export function calculateBondStats(
  transactions: Transaction[],
  prizes: Prize[]
): CalculationResult {
  const allDates = [
    ...transactions.map((t) => t.date),
    ...prizes.map((p) => p.date),
  ];
  const minYear = Math.min(...allDates.map((d) => d.getFullYear()));
  const maxYear = Math.max(...allDates.map((d) => d.getFullYear()));

  const byYear: YearResult[] = [];

  for (let year = minYear; year <= maxYear; year++) {
    const avgBalance = averageBalanceForYear(year, transactions);
    const prizesWon = prizes
      .filter((p) => p.date.getFullYear() === year)
      .reduce((sum, p) => sum + p.amount, 0);
    const amountInvested = transactions
      .filter((t) => t.date.getFullYear() === year)
      .reduce((sum, t) => sum + (t.type === 'deposit' ? t.amount : -t.amount), 0);

    const effectiveRatePct =
      avgBalance > 0 ? Number(((prizesWon / avgBalance) * 100).toFixed(2)) : 0;

    byYear.push({ year, amountInvested, averageBalance: avgBalance, prizesWon, effectiveRatePct });
  }

  const totalInvested = transactions
    .filter((t) => t.type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalPrizesWon = prizes.reduce((sum, p) => sum + p.amount, 0);

  // Overall rate = average annual prizes / average annual balance.
  // Dividing total prizes by number of years gives average annual prizes,
  // then dividing by the mean annual balance gives the rate. This avoids
  // the skew you'd get from a simple mean of yearly percentages, where a
  // low-balance year with 0% would drag the result down unfairly.
  const meanAnnualBalance =
    byYear.reduce((sum, y) => sum + y.averageBalance, 0) / byYear.length;
  const averageAnnualRatePct =
    meanAnnualBalance > 0
      ? Number(((totalPrizesWon / byYear.length / meanAnnualBalance) * 100).toFixed(2))
      : 0;

  return {
    byYear,
    overall: {
      totalInvested,
      totalPrizesWon,
      averageAnnualRatePct,
    },
  };
}
