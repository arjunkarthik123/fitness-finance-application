/**
 * The Market Simulation running on the device. Every asset in the catalogue
 * has one market price, whether or not anyone holds it, so the Exchange
 * (unowned assets) and the Portfolio (owned assets) always see the same price.
 *
 * POC price model: each tick multiplies an asset's price by a random factor
 * between 0.8 and 1.2. The MIS model (correlated returns, downturns,
 * dividends) replaces `nextLevel` later without changing the access programs.
 *
 * Ticks run lazily: whenever a price is read, the market first catches up on
 * every TickInterval that has passed since the last tick. `tick()` forces one
 * extra tick right away, for demos and tests.
 *
 * State lives in memory for the POC, so prices restart from each asset's
 * start price when the app restarts.
 */
import { ASSETS } from '@/asset';

import {
  MarketError,
  type AssetId,
  type MarketEnvironment,
  type PricePoint,
  type TickFactor,
} from './types';

export const TICK_INTERVAL_MS = 15 * 60 * 1000;
export const MIN_PRICE = 0.01;
export const MIN_FACTOR = 0.8;
export const MAX_FACTOR = 1.2;

const defaultEnvironment: MarketEnvironment = { now: () => new Date(), random: Math.random };
let env = defaultEnvironment;

/** Unrounded price of each asset, used by the price model (MIS `level`). */
const level = new Map<AssetId, number>();
/** Every published price, in time order (MIS `history`). */
let history: PricePoint[] = [];
let lastTick: number | null = null;

const round2 = (value: number) => Math.round(value * 100) / 100;

function drawFactor(): number {
  return MIN_FACTOR + (MAX_FACTOR - MIN_FACTOR) * env.random();
}

function publish(asset: AssetId, time: number): void {
  const price = Math.max(MIN_PRICE, round2(level.get(asset)!));
  history.push({ asset, time: new Date(time), price });
}

/** Starts simulated time and publishes each asset's start price. */
export function init(): void {
  if (lastTick !== null) return;
  lastTick = env.now().getTime();
  for (const asset of ASSETS) {
    level.set(asset.id, asset.startPrice);
    publish(asset.id, lastTick);
  }
}

function runTick(time: number): TickFactor[] {
  const factors: TickFactor[] = [];
  for (const asset of ASSETS) {
    const current = level.get(asset.id);
    if (current === undefined) {
      // An asset added to the catalogue after init starts at its start price.
      level.set(asset.id, asset.startPrice);
    } else {
      const factor = drawFactor();
      level.set(asset.id, current * factor);
      factors.push({ asset: asset.id, factor });
    }
    publish(asset.id, time);
  }
  lastTick = time;
  return factors;
}

/** Runs one tick for every TickInterval that has passed since the last one. */
function catchUp(): void {
  init();
  const now = env.now().getTime();
  while (now - lastTick! >= TICK_INTERVAL_MS) runTick(lastTick! + TICK_INTERVAL_MS);
}

/** Moves every price once, right now, and returns the factor each price was multiplied by. */
export function tick(): TickFactor[] {
  catchUp();
  return runTick(Math.max(env.now().getTime(), lastTick!));
}

function latest(asset: AssetId): PricePoint {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].asset === asset) return history[i];
  }
  throw new MarketError('UnknownAsset', `No asset with id ${asset}.`);
}

/** The current price of `asset`. */
export async function getPrice(asset: AssetId): Promise<PricePoint> {
  if (!ASSETS.some((candidate) => candidate.id === asset)) {
    throw new MarketError('UnknownAsset', `No asset with id ${asset}.`);
  }
  catchUp();
  return latest(asset);
}

/** The current price of every asset. */
export async function getPrices(): Promise<PricePoint[]> {
  catchUp();
  return ASSETS.map((asset) => latest(asset.id));
}

/** Every published price of `asset`, oldest first. */
export async function getHistory(asset: AssetId): Promise<PricePoint[]> {
  await getPrice(asset);
  return history.filter((point) => point.asset === asset);
}

/** Tests only: clears all market state and optionally swaps the clock and random source. */
export function resetMarket(overrides: Partial<MarketEnvironment> = {}): void {
  env = { ...defaultEnvironment, ...overrides };
  level.clear();
  history = [];
  lastTick = null;
}
