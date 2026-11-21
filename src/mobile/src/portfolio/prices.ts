/**
 * PLACEHOLDER for what the Portfolio needs from other modules: asset details
 * (Asset, MIS M7) and current prices (Market Simulation, MIS M14). Prices
 * follow a fixed wave around each asset's start price and change every 15
 * minutes (the MIS TickInterval), so gains and losses show up in testing.
 *
 * When those modules exist, delete this file and import `getPrice` from the
 * Market Simulation module in `local.ts` instead. Its MIS shape is the same
 * (`getPrice(a)` → `{ asset, time, price }`), so nothing else changes.
 */
import type { AssetId } from './types';

const TICK_INTERVAL_MS = 15 * 60 * 1000;
const MIN_PRICE = 0.01;

export type PlaceholderAsset = { id: AssetId; symbol: string; name: string; startPrice: number };

export const PLACEHOLDER_ASSETS: readonly PlaceholderAsset[] = [
  { id: 1, symbol: 'FLEX', name: "Flexin' Fitness Co.", startPrice: 12.5 },
  { id: 2, symbol: 'STRD', name: 'Stride Treasury Bond', startPrice: 25 },
  { id: 3, symbol: 'RUN', name: 'Runners Index ETF', startPrice: 40 },
  { id: 4, symbol: 'GAIN', name: 'Gains Growth Fund', startPrice: 8.75 },
];

/** An asset's price, in FLX, from `time` until the next tick (MIS PricePoint). */
export type PricePoint = { asset: AssetId; time: Date; price: number };

/** The current price of `asset`. Throws for an asset that doesn't exist. */
export async function getPrice(asset: AssetId, now: Date = new Date()): Promise<PricePoint> {
  const found = PLACEHOLDER_ASSETS.find((a) => a.id === asset);
  if (!found) {
    throw new Error(`No asset with id ${asset}.`);
  }
  const tick = Math.floor(now.getTime() / TICK_INTERVAL_MS);
  const swing = 0.08 * Math.sin(tick / 6 + asset) + 0.04 * Math.sin(tick / 23 + 2 * asset);
  const price = Math.max(MIN_PRICE, Math.round(found.startPrice * (1 + swing) * 100) / 100);
  return { asset, time: new Date(tick * TICK_INTERVAL_MS), price };
}
