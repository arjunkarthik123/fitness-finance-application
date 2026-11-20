import { getBalance } from '@/ledger';
import {
  getHoldingTotals,
  insertHoldingChange,
  listHoldingTotals,
  withTransaction,
  type HoldingTotals,
  type Transaction,
} from '@/persistence';

/** An asset's id, e.g. `FLEX`. Will come from the Asset module once it exists. */
export type AssetId = string;

/** The current price of one unit of an asset, in FLX. */
export type PriceLookup = (asset: AssetId) => number;

/** One asset the user holds, or once held. Amounts are FLX, two decimal places. */
export type Holding = {
  asset: AssetId;
  /** Whole units held now. 0 for an asset that was sold out. */
  qty: number;
  /** What the user paid for the units held now. */
  cost: number;
  /** Current price of one unit. */
  price: number;
  /** Current value of the units held: `qty * price`. */
  value: number;
  /** Unrealized gain on the units held: `value - cost`. Negative for a loss. */
  gain: number;
  /** Gain realized by every sale of this asset so far. */
  realized: number;
  /** Gain over the asset's whole history: `realized + gain`. */
  lifetimeGain: number;
};

/** The portfolio as a whole (MIS getSummary). Amounts are FLX. */
export type Summary = {
  /** Uninvested FLX: the ledger balance. */
  cash: number;
  /** Current value of all holdings. */
  invested: number;
  /** `cash + invested`. */
  total: number;
  /** What was paid for all holdings. */
  cost: number;
  /** `invested - cost`. */
  unrealized: number;
  /** Gain realized by every sale so far, across all assets. */
  realized: number;
  /** `realized + unrealized`. */
  lifetimeGain: number;
};

export type PortfolioErrorCode = 'InvalidQuantity' | 'InvalidAmount' | 'InsufficientUnits';

export class PortfolioError extends Error {
  constructor(
    readonly code: PortfolioErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PortfolioError';
  }
}

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

/** Runs `task` in the caller's transaction if given, else in a new one. */
const inTransaction = <T>(tx: Transaction | undefined, task: (tx: Transaction) => Promise<T>) =>
  tx ? task(tx) : withTransaction(task);

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
        `Cannot sell ${qty} ${asset}: only ${held.units} held.`,
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

/** One asset's holding at `price`, with its lifetime gain. Works for assets sold out or never held. */
export async function getHolding(asset: AssetId, price: number): Promise<Holding> {
  return toHolding(await getHoldingTotals(asset), price);
}

/**
 * Every asset held now, by asset id. With `includeSold`, also assets that were
 * sold out, so their lifetime gain can still be shown.
 */
export async function getHoldings(
  priceOf: PriceLookup,
  options: { includeSold?: boolean } = {},
): Promise<Holding[]> {
  const totals = await listHoldingTotals();
  return totals
    .filter((t) => options.includeSold || t.units > 0)
    .map((t) => toHolding(t, t.units > 0 ? priceOf(t.asset) : 0));
}

/** The portfolio as a whole: cash from the Currency Ledger plus every holding. */
export async function getSummary(priceOf: PriceLookup): Promise<Summary> {
  const [cash, holdings] = await Promise.all([
    getBalance(),
    getHoldings(priceOf, { includeSold: true }),
  ]);
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
