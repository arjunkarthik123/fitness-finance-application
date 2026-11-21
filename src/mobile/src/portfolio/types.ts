/**
 * Types shared by both Portfolio implementations (on-device and API), so a
 * screen gets the same shapes whichever backend is in use. They follow MIS
 * M9, with `realized` and `lifetimeGain` added to Holding so the lifetime gain
 * on each asset can be shown. The API returns these same shapes as JSON.
 */
/** An asset's id: a whole number, as in the MIS. Will come from the Asset module. */
export type AssetId = number;

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
  /** Uninvested FLX: the Currency Ledger balance. */
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

export type HoldingsOptions = {
  /** Also return assets that were sold out (qty 0), so their lifetime gain can be shown. */
  includeSold?: boolean;
};

/**
 * What screens can ask the Portfolio for: the programs the MIS makes
 * available through the API. Implemented on the device (`local.ts`) and
 * over HTTP (`remote.ts`).
 */
export interface PortfolioClient {
  /** Every asset held now, by asset id. */
  getHoldings(options?: HoldingsOptions): Promise<Holding[]>;
  /** One asset's holding, including one sold out or never held (qty 0). */
  getHolding(asset: AssetId): Promise<Holding>;
  getSummary(): Promise<Summary>;
}

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
