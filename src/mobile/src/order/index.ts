import { asset } from '@/asset';
import { addBalance, getBalance, subtractBalance } from '@/ledger';
import { getPrice } from '@/portfolio/prices';
import { addUnits, removeUnits } from '@/portfolio';
import { getLedgerEntry, withTransaction } from '@/persistence';

export type TradeResult = {
  asset: number;
  quantity: number;
  price: number;
  total: number;
  balance: number;
};

export async function buyAsset(
  assetId: number,
  quantity: number,
  orderId: string,
): Promise<TradeResult> {
  let taken = false;
  try {
    return await withTransaction(async (tx) => {
      const key = `asset-buy:${orderId}`;
      if (await getLedgerEntry(key, tx)) {
        const price = (await getPrice(assetId)).price;
        const total = Math.round(price * quantity * 100) / 100;
        return {
          asset: assetId,
          quantity,
          price,
          total,
          balance: await getBalance(tx),
        };
      }
      const available = await asset.getAsset(assetId);
      if (available.available < quantity) {
        throw new Error(`Only ${available.available} units of ${available.symbol} are available.`);
      }
      const price = (await getPrice(assetId)).price;
      const total = Math.round(price * quantity * 100) / 100;
      const balance = await subtractBalance(
        total,
        { key: `asset-buy:${orderId}`, reason: 'asset-buy' },
        tx,
      );
      await asset.take(assetId, quantity);
      taken = true;
      await addUnits(assetId, quantity, total, tx);
      return { asset: assetId, quantity, price, total, balance };
    });
  } catch (error) {
    if (taken) await asset.release(assetId, quantity);
    throw error;
  }
}

export async function sellAsset(
  assetId: number,
  quantity: number,
  orderId: string,
): Promise<TradeResult> {
  let released = false;
  try {
    return await withTransaction(async (tx) => {
      const price = (await getPrice(assetId)).price;
      const total = Math.round(price * quantity * 100) / 100;
      await asset.release(assetId, quantity);
      released = true;
      await removeUnits(assetId, quantity, total, tx);
      const balance = await addBalance(
        total,
        { key: `asset-sell:${orderId}`, reason: 'asset-sell' },
        tx,
      );
      return { asset: assetId, quantity, price, total, balance };
    });
  } catch (error) {
    if (released) await asset.take(assetId, quantity);
    throw error;
  }
}
