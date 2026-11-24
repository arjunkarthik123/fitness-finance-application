/**
 * The Market Module (Market Simulator) will create a life-like market to emulate
 * the growth and decline of securities in the stock market.
 * For POC purposes:
 * The current market will operate to increase or decrease the value of assets by a
 * random factor between 0.8 - 1.2 each tick (produced manually by the user during the
 * demo or each "naturally" each hour).
 * This module will be studied by the team to ensure a fair, but balanced game environment
 * that will be used to practice good good investing habits.
 * Geometric Brownian Motion - model used for stock prices (https://stats.libretexts.org/Bookshelves/Probability_Theory/Probability_Mathematical_Statistics_and_Stochastic_Processes_(Siegrist)/18%3A_Brownian_Motion/18.04%3A_Geometric_Brownian_Motion)
 * Merton-jump diffusion - will be able to create unpredictable behaviour (https://www.maxmatsuda.com/Papers/Intro/Intro%20to%20MJD%20Matsuda.pdf)
 * Markov Chain - controlling the overall flow (https://www.quantt.co.uk/resources/markov-chain-explained)
 */
import { ASSETS } from '@/asset';

import {
  MarketError,
  type AssetId,
  type MarketEnvironment,
  type PricePoint,
  type TickFactor,
} from './types';

/** Every 15 minutes the market will update (natural update) */
export const TICK_INTERVAL_MS = 15 * 60 * 1000;
export const MIN_PRICE = 0.01;
export const MIN_FACTOR = 0.8;
export const MAX_FACTOR = 1.2;

const defaultEnvironment: MarketEnvironment = { now: () => new Date(), random: Math.random };
let env = defaultEnvironment;

/** AssetID mapped to the unrounded price of the asset. */
const level = new Map<AssetId, number>();

/** Every published price, in time order. */
let history: PricePoint[] = [];
let lastTick: number | null = null;

const round2 = (value: number) => Math.round(value * 100) / 100;

function drawFactor(): number {
  return MIN_FACTOR + (MAX_FACTOR - MIN_FACTOR) * env.random();
}

/** Add the new price to the history */
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

/** Moves each asset forward based in the tick factor, updates and saves the prices and time */
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

/** Returns the latest price of a singular asset*/
function latest(asset: AssetId): PricePoint {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].asset === asset) return history[i];
  }
  throw new MarketError('UnknownAsset', `No asset with id ${asset}.`);
}

/** The current price of `asset`, (singular asset). */
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
