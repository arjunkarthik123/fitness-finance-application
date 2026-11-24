import type { AssetId } from '@/asset';

export type { AssetId };

/** An asset's price, in FLX, from `time` until the next tick (MIS PricePoint). */
export type PricePoint = { asset: AssetId; time: Date; price: number };

/** The random factor an asset's price was multiplied by in one tick. */
export type TickFactor = { asset: AssetId; factor: number };

export type MarketErrorCode = 'UnknownAsset';

export class MarketError extends Error {
  constructor(
    readonly code: MarketErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'MarketError';
  }
}

/** Clock and random source, replaceable in tests (MIS environment variables). */
export type MarketEnvironment = {
  now: () => Date;
  /** Returns a number in [0, 1), like Math.random. */
  random: () => number;
};
