import * as expoSqlite from 'expo-sqlite';

import { ASSETS } from '@/asset';
import { resetLocalAssetState } from '@/asset/local';
import { addBalance } from '@/ledger';
import {
  getHistory,
  getPrice,
  getPrices,
  MarketError,
  MAX_FACTOR,
  MIN_FACTOR,
  TICK_INTERVAL_MS,
  tick,
} from '@/market';
import { resetMarket } from '@/market/local';
import { buyAsset } from '@/order';
import { closeDatabase } from '@/persistence/database';
import { portfolio } from '@/portfolio';

const sqlite = expoSqlite as unknown as typeof import('../__mocks__/expo-sqlite');

const FLEX = 1; // start price 12.5
const STRD = 2; // start price 25

let clock: number;
let draws: number[];
const advance = (ms: number) => (clock += ms);

beforeEach(() => {
  clock = Date.UTC(2026, 0, 1);
  draws = [];
  // Each tick takes one draw per asset, in catalogue order. 0.5 → factor 1.0.
  resetMarket({ now: () => new Date(clock), random: () => draws.shift() ?? 0.5 });
});

it('starts every asset, owned or not, at its start price', async () => {
  const prices = await getPrices();
  expect(prices.map((p) => p.price)).toEqual(ASSETS.map((a) => a.startPrice));
});

it('multiplies the price by a factor between 0.8 and 1.2 on each tick', async () => {
  draws = [0, 0.999999, 0.5, 0.25];
  const factors = tick();
  expect(factors.map((f) => f.asset)).toEqual(ASSETS.map((a) => a.id));
  expect(factors.map((f) => f.factor.toFixed(2))).toEqual(['0.80', '1.20', '1.00', '0.90']);
  expect((await getPrices()).map((p) => p.price)).toEqual([
    10, // 12.5 × 0.8
    30, // 25 × ~1.2
    40, // 40 × 1.0
    7.88, // 8.75 × 0.9
  ]);
  expect(MIN_FACTOR).toBe(0.8);
  expect(MAX_FACTOR).toBe(1.2);
});

it('compounds on the unrounded price and never drops below 0.01', async () => {
  draws = Array(200).fill(0);
  for (let i = 0; i < 50; i++) tick();
  expect((await getPrice(FLEX)).price).toBe(0.01);
});

it('stays within the expected range under the real random source', async () => {
  resetMarket({ now: () => new Date(clock) });
  tick();
  const { price } = await getPrice(FLEX);
  expect(price).toBeGreaterThanOrEqual(10);
  expect(price).toBeLessThanOrEqual(15);
});

it('catches up one tick per 15 minutes that have passed', async () => {
  await getPrice(FLEX);
  advance(TICK_INTERVAL_MS - 1);
  expect(await getHistory(FLEX)).toHaveLength(1);
  draws = [0.75, 0.5, 0.5, 0.5, 0.75, 0.5, 0.5, 0.5];
  advance(TICK_INTERVAL_MS + 1);
  const history = await getHistory(FLEX);
  expect(history.map((p) => p.price)).toEqual([12.5, 13.75, 15.13]);
  expect(history[2].time.getTime() - history[1].time.getTime()).toBe(TICK_INTERVAL_MS);
});

it('rejects an unknown asset', async () => {
  await expect(getPrice(999)).rejects.toBeInstanceOf(MarketError);
});

describe('with the app modules', () => {
  beforeEach(async () => {
    await closeDatabase();
    sqlite.__resetAllDatabases();
    resetLocalAssetState();
  });

  it('trades at the market price and revalues owned assets when it moves', async () => {
    await addBalance(100, { key: 'funds', reason: 'test' });
    expect(await buyAsset(FLEX, 2, 'o1')).toMatchObject({ price: 12.5, total: 25 });

    draws = [0.75, 0]; // FLEX × 1.1, STRD × 0.8
    tick();
    expect(await portfolio.getHolding(FLEX)).toMatchObject({ qty: 2, price: 13.75, value: 27.5 });
    // STRD is not owned, but its price moved too.
    expect((await getPrice(STRD)).price).toBe(20);
  });
});
