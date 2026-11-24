import * as expoSqlite from 'expo-sqlite';

import { ASSETS, AssetError, asset } from '@/asset';
import { resetLocalAssetState } from '@/asset/local';
import { addBalance, getBalance } from '@/ledger';
import { closeDatabase } from '@/persistence/database';
import { getUnits, portfolio } from '@/portfolio';
import { buyAsset, sellAsset } from '@/order';

const sqlite = expoSqlite as unknown as typeof import('../__mocks__/expo-sqlite');

jest.mock('@/market', () => ({
  getPrice: async (id: number) => ({
    asset: id,
    time: new Date(0),
    price: id === 1 ? 15 : 25,
  }),
}));

beforeEach(async () => {
  await closeDatabase();
  sqlite.__resetAllDatabases();
  resetLocalAssetState();
});

it('lists the hard-coded MIS asset catalogue ordered by symbol', async () => {
  const assets = await asset.getAssets();
  expect(ASSETS).toHaveLength(4);
  expect(assets.map((item) => item.symbol)).toEqual(['FLEX', 'GAIN', 'RUN', 'STRD']);
  expect(assets.find((item) => item.symbol === 'FLEX')).toMatchObject({
    type: 'STOCK',
    startPrice: 12.5,
    supply: 1000,
    available: 1000,
  });
});

it('takes and releases units and rejects invalid supply changes', async () => {
  await asset.take(1, 3);
  expect(await asset.getAsset(1)).toMatchObject({ available: 997 });
  await asset.release(1, 2);
  expect(await asset.getAsset(1)).toMatchObject({ available: 999 });
  await expect(asset.take(999, 1)).rejects.toBeInstanceOf(AssetError);
  await expect(asset.take(1, 1001)).rejects.toMatchObject({ code: 'InsufficientSupply' });
});

it('buys one whole unit atomically with the ledger and portfolio', async () => {
  await addBalance(100, { key: 'test-funds', reason: 'test' });
  const result = await buyAsset(1, 1, 'order-1');
  expect(result).toMatchObject({ asset: 1, quantity: 1, price: 15, total: 15, balance: 85 });
  expect(await getUnits(1)).toBe(1);
  expect(await getBalance()).toBe(85);
  expect(await asset.getAsset(1)).toMatchObject({ available: 999 });
  expect(await portfolio.getHolding(1)).toMatchObject({ qty: 1, cost: 15, value: 15 });
});

it('does not apply a repeated buy order twice', async () => {
  await addBalance(100, { key: 'test-funds', reason: 'test' });
  await buyAsset(1, 1, 'order-repeat');
  await expect(buyAsset(1, 1, 'order-repeat')).resolves.toMatchObject({ balance: 85 });
  expect(await getUnits(1)).toBe(1);
  expect(await getBalance()).toBe(85);
});

it('rejects a purchase that exceeds supply', async () => {
  await addBalance(100000, { key: 'test-funds', reason: 'test' });
  await expect(buyAsset(1, 1001, 'too-many')).rejects.toThrow('1000');
  expect(await getUnits(1)).toBe(0);
  expect(await getBalance()).toBe(100000);
});
