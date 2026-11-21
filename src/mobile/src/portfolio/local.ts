/**
 * The Portfolio running on the device (BACKEND=local). This is the code that
 * moves to the Java backend later: the same rules, with its data stored
 * through `@/persistence` here and through JPA there.
 *
 * Uses (MIS M9): Market Simulation for prices (a placeholder in `prices.ts`
 * for now), Currency Ledger for the cash balance, Persistence for storage.
 */
import { getBalance } from '@/ledger';
import {
  getHoldingTotals,
  insertHoldingChange,
  listHoldingTotals,
  withTransaction,
  type HoldingTotals,
  type Transaction,
} from '@/persistence';

import { getPrice } from './prices';
import {
  PortfolioError,
  type AssetId,
  type Holding,
  type HoldingsOptions,
  type PortfolioClient,
  type Summary,
} from './types';

/** Units are whole shares only: no fractions. */
function checkQuantity(qty: number): void {
  if (!Number.isSafeInteger(qty) || qty < 1) {
    throw new PortfolioError(
      'InvalidQuantity',
      `Quantity must be a whole number of at least 1, got ${qty}.`,
    );
  }
}

/** Same rule as the Currency Ledger: ≥ 0 FLX with at most two decimal places. */
function checkAmount(amount: number): void {
  // Tolerance for binary floats, e.g. 37.11 * 100 = 3711.0000000000005.
  const twoDecimals = Math.abs(Math.round(amount * 100) - amount * 100) < 1e-6;
  if (!Number.isFinite(amount) || amount < 0 || !twoDecimals) {
    throw new PortfolioError(
      'InvalidAmount',
      `Amount must be ≥ 0 FLX with at most two decimal places, got ${amount}.`,
    );
  }
}

/** Rounds to two decimal places, clearing float noise from sums like 0.1 + 0.2. */
function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/** `n / d` for whole numbers, rounded to a whole number with ties to the even one. */
function divideRounded(n: number, d: number): number {
  const quotient = Math.floor(n / d);
  const twiceRemainder = 2 * (n - quotient * d);
  if (twiceRemainder > d) return quotient + 1;
  if (twiceRemainder < d) return quotient;
  return quotient % 2 === 0 ? quotient : quotient + 1;
}

/**
 * The part of cost `k` FLX of `n` units that belongs to `q` of them, at
 * average cost (MIS costOf): `round_2(k * q / n)`, ties to even. Selling every
 * unit takes the whole cost, so no rounding remainder is left behind.
 */
export function costOf(n: number, k: number, q: number): number {
  // Worked in hundredths so the rounding is exact.
  return q === n ? k : divideRounded(Math.round(k * 100) * q, n) / 100;
}

function toHolding(totals: HoldingTotals, price: number): Holding {
  const cost = round2(totals.cost);
  const realized = round2(totals.realized);
  const value = round2(totals.units * price);
  const gain = round2(value - cost);
  return {
    asset: totals.asset,
    qty: totals.units,
    cost,
    price,
    value,
    gain,
    realized,
    lifetimeGain: round2(realized + gain),
  };
}

async function valued(totals: HoldingTotals): Promise<Holding> {
  return toHolding(totals, (await getPrice(totals.asset)).price);
}

/** Runs `task` in the caller's transaction if given, else in a new one. */
const inTransaction = <T>(tx: Transaction | undefined, task: (tx: Transaction) => Promise<T>) =>
  tx ? task(tx) : withTransaction(task);

// --- Backend-only programs (MIS: not available through the API) ---------------
// Called by the Transaction Order module inside the transaction of a trade.

/** Whole units of `asset` held now. 0 if none. */
export async function getUnits(asset: AssetId, tx?: Transaction): Promise<number> {
  return (await getHoldingTotals(asset, tx)).units;
}

/**
 * Records a purchase of `qty` whole units of `asset` for `paid` FLX in total.
 * Pass the trade's `tx` so this commits together with its ledger debit.
 */
export async function addUnits(
  asset: AssetId,
  qty: number,
  paid: number,
  tx?: Transaction,
  now: Date = new Date(),
): Promise<void> {
  checkQuantity(qty);
  checkAmount(paid);
  await insertHoldingChange({ asset, units: qty, total: paid, cost: paid, realized: 0 }, tx, now);
}

/**
 * Records a sale of `qty` whole units of `asset` for `received` FLX in total,
 * and returns the gain (negative: loss) it realized. Pass the trade's `tx` so
 * this commits together with its ledger credit.
 */
export async function removeUnits(
  asset: AssetId,
  qty: number,
  received: number,
  tx?: Transaction,
  now: Date = new Date(),
): Promise<number> {
  checkQuantity(qty);
  checkAmount(received);
  return inTransaction(tx, async (t) => {
    const held = await getHoldingTotals(asset, t);
    if (held.units < qty) {
      throw new PortfolioError(
        'InsufficientUnits',
        `Cannot sell ${qty} of asset ${asset}: only ${held.units} held.`,
      );
    }
    const share = costOf(held.units, round2(held.cost), qty);
    const realized = round2(received - share);
    await insertHoldingChange(
      { asset, units: -qty, total: received, cost: -share, realized },
      t,
      now,
    );
    return realized;
  });
}

// --- Programs a user can request (the PortfolioClient) --------------------------

async function getHoldings(options: HoldingsOptions = {}): Promise<Holding[]> {
  const totals = (await listHoldingTotals()).filter((t) => options.includeSold || t.units > 0);
  return Promise.all(totals.map(valued));
}

async function getHolding(asset: AssetId): Promise<Holding> {
  return valued(await getHoldingTotals(asset));
}

async function getSummary(): Promise<Summary> {
  const [cash, holdings] = await Promise.all([getBalance(), getHoldings({ includeSold: true })]);
  const sum = (pick: (h: Holding) => number) =>
    round2(holdings.reduce((acc, h) => acc + pick(h), 0));
  const invested = sum((h) => h.value);
  const cost = sum((h) => h.cost);
  const realized = sum((h) => h.realized);
  const unrealized = round2(invested - cost);
  return {
    cash,
    invested,
    total: round2(cash + invested),
    cost,
    unrealized,
    realized,
    lifetimeGain: round2(realized + unrealized),
  };
}

export const localPortfolio: PortfolioClient = { getHoldings, getHolding, getSummary };
