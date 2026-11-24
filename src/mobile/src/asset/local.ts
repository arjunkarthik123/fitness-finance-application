import { listHoldingTotals } from '@/persistence';

import { AssetError, type Asset, type AssetClient, type AssetId } from './types';

type AssetRecord = Omit<Asset, 'available'>;

/** Hard-coded POC catalogue. The POC has no administrator asset management. */
export const ASSETS: readonly AssetRecord[] = [
  {
    id: 1,
    symbol: 'FLEX',
    name: "Flexin' Fitness Co.",
    type: 'STOCK',
    startPrice: 12.5,
    yield: 0,
    supply: 1000,
  },
  {
    id: 2,
    symbol: 'STRD',
    name: 'Stride Treasury Bond',
    type: 'BOND',
    startPrice: 25,
    yield: 4.5,
    supply: 500,
  },
  {
    id: 3,
    symbol: 'RUN',
    name: 'Runners Index ETF',
    type: 'ETF',
    startPrice: 40,
    yield: 2.25,
    supply: 750,
  },
  {
    id: 4,
    symbol: 'GAIN',
    name: 'Gains Growth Fund',
    type: 'FUND',
    startPrice: 8.75,
    yield: 1.5,
    supply: 1500,
  },
] as const;

const outstanding = new Map<AssetId, number>();
const persistedOutstanding = new Map<AssetId, number>();

async function syncOutstanding(): Promise<void> {
  const totals = await listHoldingTotals();
  for (const asset of ASSETS) {
    const held = totals.find((total) => total.asset === asset.id)?.units ?? 0;
    if (persistedOutstanding.get(asset.id) !== held) {
      outstanding.set(asset.id, held);
      persistedOutstanding.set(asset.id, held);
    }
  }
}

export function resetLocalAssetState(): void {
  outstanding.clear();
  persistedOutstanding.clear();
}

function record(asset: AssetRecord): Asset {
  const held = outstanding.get(asset.id) ?? 0;
  return { ...asset, available: Math.max(0, asset.supply - held) };
}

async function getAssets(): Promise<Asset[]> {
  await syncOutstanding();
  return [...ASSETS].sort((a, b) => a.symbol.localeCompare(b.symbol)).map(record);
}

async function getAsset(asset: AssetId): Promise<Asset> {
  await syncOutstanding();
  const found = ASSETS.find((candidate) => candidate.id === asset);
  if (!found) throw new AssetError('UnknownAsset', `No asset with id ${asset}.`);
  return record(found);
}

function checkQuantity(qty: number): void {
  if (!Number.isSafeInteger(qty) || qty < 1) {
    throw new AssetError('InsufficientSupply', 'Quantity must be a whole number of at least 1.');
  }
}

async function take(asset: AssetId, qty: number): Promise<Asset> {
  checkQuantity(qty);
  const current = await getAsset(asset);
  if (current.available < qty) {
    throw new AssetError(
      'InsufficientSupply',
      `Only ${current.available} units of ${current.symbol} are available.`,
    );
  }
  outstanding.set(asset, (outstanding.get(asset) ?? 0) + qty);
  return record(current);
}

async function release(asset: AssetId, qty: number): Promise<Asset> {
  checkQuantity(qty);
  const current = await getAsset(asset);
  const held = outstanding.get(asset) ?? 0;
  if (held < qty) {
    throw new AssetError('NotOutstanding', `${qty} units of ${current.symbol} are not held.`);
  }
  outstanding.set(asset, held - qty);
  return record(current);
}

export const localAsset: AssetClient = { getAsset, getAssets, take, release };
