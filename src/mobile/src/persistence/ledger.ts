/**
 * Storage for ledger entries. Entries can only be inserted and read: there is
 * deliberately no update or delete (SEC-AUD-01). Business rules (valid
 * amounts, never going below zero) belong to the Currency Ledger module.
 */
import { executor, type Transaction } from './database';

export type NewLedgerEntry = {
  /** Unique id for this change. Inserting a key that is already stored does nothing. */
  key: string;
  /** FLX, at most two decimal places: positive credits, negative debits. */
  amount: number;
  /** Why the FLX moved, e.g. `steps-reward` or `asset-buy`. */
  reason: string;
};

export type LedgerEntry = NewLedgerEntry & { id: number; createdAt: string };

type Row = { id: number; key: string; amount: number; reason: string; created_at: string };

const fromRow = (row: Row): LedgerEntry => ({
  id: row.id,
  key: row.key,
  amount: row.amount,
  reason: row.reason,
  createdAt: row.created_at,
});

/** Stores an entry. Returns null, storing nothing, if its key is already stored. */
export async function insertLedgerEntry(
  entry: NewLedgerEntry,
  tx?: Transaction,
  now: Date = new Date(),
): Promise<LedgerEntry | null> {
  const createdAt = now.toISOString();
  const { changes, lastInsertRowId } = await (
    await executor(tx)
  ).runAsync(
    `INSERT INTO ledger_entries (key, amount, reason, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (key) DO NOTHING`,
    entry.key,
    entry.amount,
    entry.reason,
    createdAt,
  );
  return changes === 0 ? null : { ...entry, id: lastInsertRowId, createdAt };
}

/** The entry stored under `key`, or null. */
export async function getLedgerEntry(key: string, tx?: Transaction): Promise<LedgerEntry | null> {
  const row = await (
    await executor(tx)
  ).getFirstAsync<Row>('SELECT * FROM ledger_entries WHERE key = ?', key);
  return row ? fromRow(row) : null;
}

/** Every entry, newest first. */
export async function listLedgerEntries(tx?: Transaction): Promise<LedgerEntry[]> {
  const rows = await (
    await executor(tx)
  ).getAllAsync<Row>('SELECT * FROM ledger_entries ORDER BY id DESC');
  return rows.map(fromRow);
}

/** Sum of every entry's amount, i.e. the balance. 0 when there are none. */
export async function sumLedgerEntries(tx?: Transaction): Promise<number> {
  const row = await (
    await executor(tx)
  ).getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM ledger_entries',
  );
  return row?.total ?? 0;
}
