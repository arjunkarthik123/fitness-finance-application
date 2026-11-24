import * as expoSqlite from 'expo-sqlite';

import { addBalance, getBalance, subtractBalance } from '@/ledger';
import { listHoldingChanges, withTransaction } from '@/persistence';
import { closeDatabase } from '@/persistence/database';
import { addUnits, costOf, getUnits, portfolio, PortfolioError, removeUnits } from '@/portfolio';
import { localPortfolio } from '@/portfolio/local';

// expo-sqlite is mocked automatically by __mocks__/ (sql.js in memory).
const sqlite = expoSqlite as unknown as typeof import('../__mocks__/expo-sqlite');

// Fixed prices instead of the market's random ones.
const mockPrices = new Map<number, number>();
jest.mock('@/market', () => ({
  getPrice: async (asset: number) => ({ asset, time: new Date(0), price: mockPrices.get(asset) }),
}));

const FLEX = 1;
const GAIN = 4;

beforeEach(async () => {
  await closeDatabase();
  sqlite.__resetAllDatabases();
  mockPrices.clear();
  mockPrices.set(FLEX, 15).set(GAIN, 4);
});

it('runs on the device when EXPO_PUBLIC_BACKEND is not set', () => {
  expect(portfolio).toBe(localPortfolio);
});

describe('whole shares only', () => {
  it.each([0, -1, 1.5, Number.NaN])('rejects a quantity of %p', async (qty) => {
    await expect(addUnits(FLEX, qty, 10)).rejects.toMatchObject({ code: 'InvalidQuantity' });
    await expect(removeUnits(FLEX, qty, 10)).rejects.toMatchObject({ code: 'InvalidQuantity' });
    expect(await listHoldingChanges()).toHaveLength(0);
  });

  it('rejects a negative amount or one with more than two decimal places', async () => {
    await expect(addUnits(FLEX, 1, -5)).rejects.toMatchObject({ code: 'InvalidAmount' });
    await expect(addUnits(FLEX, 1, 2.555)).rejects.toBeInstanceOf(PortfolioError);
  });

  it('accepts FLX amounts with two decimal places', async () => {
    mockPrices.set(FLEX, 12.5);
    await addUnits(FLEX, 3, 37.11);
    expect(await portfolio.getHolding(FLEX)).toMatchObject({
      cost: 37.11,
      value: 37.5,
      gain: 0.39,
    });
  });
});

describe('units held', () => {
  it('is 0 for an asset never bought', async () => {
    expect(await getUnits(FLEX)).toBe(0);
  });

  it('adds purchases and subtracts sales', async () => {
    await addUnits(FLEX, 3, 30);
    await addUnits(FLEX, 2, 24);
    await removeUnits(FLEX, 4, 60);
    expect(await getUnits(FLEX)).toBe(1);
  });

  it('refuses to sell more than is held and changes nothing', async () => {
    await addUnits(FLEX, 2, 20);
    await expect(removeUnits(FLEX, 3, 45)).rejects.toMatchObject({ code: 'InsufficientUnits' });
    expect(await getUnits(FLEX)).toBe(2);
    expect(await listHoldingChanges()).toHaveLength(1);
  });
});

describe('gain and loss', () => {
  it('values a holding at the current market price', async () => {
    await addUnits(FLEX, 4, 40);
    expect(await portfolio.getHolding(FLEX)).toEqual({
      asset: FLEX,
      qty: 4,
      cost: 40,
      price: 15,
      value: 60,
      gain: 20,
      realized: 0,
      lifetimeGain: 20,
    });
  });

  it('follows the price as the market moves', async () => {
    await addUnits(FLEX, 4, 40);
    mockPrices.set(FLEX, 9);
    expect(await portfolio.getHolding(FLEX)).toMatchObject({ value: 36, gain: -4 });
  });

  it('shows a loss as a negative gain', async () => {
    await addUnits(GAIN, 5, 50);
    expect(await portfolio.getHolding(GAIN)).toMatchObject({
      value: 20,
      gain: -30,
      lifetimeGain: -30,
    });
  });

  it('sells at average cost and keeps the realized gain in the lifetime gain', async () => {
    await addUnits(FLEX, 2, 20); // 10 each
    await addUnits(FLEX, 2, 30); // 15 each, so 12.50 on average
    expect(await removeUnits(FLEX, 1, 20)).toBe(7.5); // cost 12.50, received 20
    expect(await portfolio.getHolding(FLEX)).toMatchObject({
      qty: 3,
      cost: 37.5,
      value: 45,
      gain: 7.5,
      realized: 7.5,
      lifetimeGain: 15,
    });
  });

  it('keeps the lifetime gain of an asset that was sold out', async () => {
    await addUnits(FLEX, 3, 30);
    await removeUnits(FLEX, 3, 21);
    expect(await portfolio.getHolding(FLEX)).toMatchObject({ qty: 0, cost: 0, lifetimeGain: -9 });
    expect(await portfolio.getHoldings()).toEqual([]);
    expect(await portfolio.getHoldings({ includeSold: true })).toEqual([
      expect.objectContaining({ asset: FLEX, qty: 0, realized: -9, lifetimeGain: -9 }),
    ]);
  });

  it('rounds a sold share of the cost to the cent, ties to even', () => {
    expect(costOf(3, 10, 1)).toBe(3.33);
    expect(costOf(3, 10, 2)).toBe(6.67);
    expect(costOf(2, 0.05, 1)).toBe(0.02); // 0.025, tie down to even
    expect(costOf(2, 0.07, 1)).toBe(0.04); // 0.035, tie up to even
    expect(costOf(3, 10, 3)).toBe(10); // all of it
  });

  it('leaves no cost behind once every unit is sold', async () => {
    await addUnits(FLEX, 3, 10);
    await removeUnits(FLEX, 1, 5);
    await removeUnits(FLEX, 1, 5);
    await removeUnits(FLEX, 1, 5);
    expect(await portfolio.getHolding(FLEX)).toMatchObject({ qty: 0, cost: 0, realized: 5 });
  });
});

describe('holdings and summary', () => {
  it('lists held assets by id with their values', async () => {
    await addUnits(GAIN, 5, 50);
    await addUnits(FLEX, 2, 20);
    expect((await portfolio.getHoldings()).map((h) => [h.asset, h.qty, h.value])).toEqual([
      [FLEX, 2, 30],
      [GAIN, 5, 20],
    ]);
  });

  it('adds the ledger balance as cash, and every asset including ones sold out', async () => {
    await addBalance(12.34, { key: 'steps:1', reason: 'steps-reward' });
    await addUnits(FLEX, 2, 20);
    await addUnits(GAIN, 5, 50);
    await removeUnits(GAIN, 5, 60);
    expect(await portfolio.getSummary()).toEqual({
      cash: 12.34,
      invested: 30,
      total: 42.34,
      cost: 20,
      unrealized: 10,
      realized: 10,
      lifetimeGain: 20,
    });
  });

  it('is all zero for an empty portfolio', async () => {
    expect(await portfolio.getSummary()).toEqual({
      cash: 0,
      invested: 0,
      total: 0,
      cost: 0,
      unrealized: 0,
      realized: 0,
      lifetimeGain: 0,
    });
  });
});

describe('trades', () => {
  beforeEach(() => addBalance(100, { key: 'steps:1', reason: 'steps-reward' }));

  it('commits with the ledger debit in one transaction', async () => {
    await withTransaction(async (tx) => {
      await subtractBalance(30, { key: 'asset-buy:1', reason: 'asset-buy' }, tx);
      await addUnits(FLEX, 3, 30, tx);
    });
    expect(await getUnits(FLEX)).toBe(3);
    expect(await getBalance()).toBe(70);
  });

  it('rolls back with the ledger credit when the sale fails', async () => {
    await addUnits(FLEX, 1, 10);
    await expect(
      withTransaction(async (tx) => {
        await addBalance(50, { key: 'asset-sell:1', reason: 'asset-sell' }, tx);
        await removeUnits(FLEX, 5, 50, tx);
      }),
    ).rejects.toMatchObject({ code: 'InsufficientUnits' });
    expect(await getBalance()).toBe(100);
    expect(await getUnits(FLEX)).toBe(1);
  });

  it('keeps holdings after the app closes and reopens the database', async () => {
    await addUnits(FLEX, 2, 20);
    await closeDatabase();
    expect(await getUnits(FLEX)).toBe(2);
  });
});
