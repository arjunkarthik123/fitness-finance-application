/**
 * Storage for portfolio holding changes. Changes can only be inserted and
 * read, like ledger entries: what a user holds is the sum of them. Business
 * rules (whole units only, never selling more than is held, average cost)
 * belong to the Portfolio module (src/portfolio).
 */
import { executor, type Transaction } from './database';

export type NewHoldingChange = {
  /** Asset id (MIS AssetID, a whole number). */
  asset: number;
  /** Whole units: positive bought, negative sold. */
  units: number;
  /** FLX paid for a buy or received for a sale, at most two decimal places. */
  total: number;
  /** Change to the cost of the units held: what was paid on a buy, minus the sold units' share on a sale. */
  cost: number;
  /** Gain (negative for a loss) a sale realized. 0 for a buy. */
  realized: number;
};

export type HoldingChange = NewHoldingChange & { id: number; createdAt: string };

/** One asset's changes summed. All zero for an asset never traded. */
export type HoldingTotals = {
  asset: number;
  /** Units held now. */
  units: number;
  /** What was paid for the units held now. */
  cost: number;
  /** Gain realized by every sale of this asset so far. */
  realized: number;
};

type Row = {
  id: number;
  asset: number;
  units: number;
  total: number;
  cost: number;
  realized: number;
  created_at: string;
};

const fromRow = (row: Row): HoldingChange => ({
  id: row.id,
  asset: row.asset,
  units: row.units,
  total: row.total,
  cost: row.cost,
  realized: row.realized,
  createdAt: row.created_at,
});

const TOTALS = `SELECT asset,
  COALESCE(SUM(units), 0) AS units,
  COALESCE(SUM(cost), 0) AS cost,
  COALESCE(SUM(realized), 0) AS realized
  FROM holding_changes`;

/** Stores a change. */
export async function insertHoldingChange(
  change: NewHoldingChange,
  tx?: Transaction,
  now: Date = new Date(),
): Promise<HoldingChange> {
  const createdAt = now.toISOString();
  const { lastInsertRowId } = await (
    await executor(tx)
  ).runAsync(
    `INSERT INTO holding_changes (asset, units, total, cost, realized, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    change.asset,
    change.units,
    change.total,
    change.cost,
    change.realized,
    createdAt,
  );
  return { ...change, id: lastInsertRowId, createdAt };
}

/** Every change, newest first. With `asset`, only that asset's. */
export async function listHoldingChanges(
  options: { asset?: number } = {},
  tx?: Transaction,
): Promise<HoldingChange[]> {
  const db = await executor(tx);
  const rows =
    options.asset === undefined
      ? await db.getAllAsync<Row>('SELECT * FROM holding_changes ORDER BY id DESC')
      : await db.getAllAsync<Row>(
          'SELECT * FROM holding_changes WHERE asset = ? ORDER BY id DESC',
          options.asset,
        );
  return rows.map(fromRow);
}

/** One asset's totals. All zero if it was never traded. */
export async function getHoldingTotals(asset: number, tx?: Transaction): Promise<HoldingTotals> {
  const row = await (
    await executor(tx)
  ).getFirstAsync<HoldingTotals>(`${TOTALS} WHERE asset = ? GROUP BY asset`, asset);
  return row ?? { asset, units: 0, cost: 0, realized: 0 };
}

/** Totals for every asset ever traded, including ones since sold out, by asset id. */
export async function listHoldingTotals(tx?: Transaction): Promise<HoldingTotals[]> {
  return (await executor(tx)).getAllAsync<HoldingTotals>(`${TOTALS} GROUP BY asset ORDER BY asset`);
}
