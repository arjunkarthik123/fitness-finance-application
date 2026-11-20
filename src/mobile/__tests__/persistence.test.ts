import * as expoSqlite from 'expo-sqlite';

import {
  getDailySteps,
  getHoldingTotals,
  getLedgerEntry,
  insertHoldingChange,
  insertLedgerEntry,
  listDailySteps,
  listHoldingChanges,
  listHoldingTotals,
  listLedgerEntries,
  resetDatabase,
  saveDailySteps,
  sumLedgerEntries,
  withTransaction,
} from '@/persistence';
import * as persistence from '@/persistence';
import { closeDatabase, getDatabase, migrate } from '@/persistence/database';
import { SCHEMA_VERSION } from '@/persistence/schema';

// expo-sqlite is mocked automatically by __mocks__/ (sql.js in memory).
// Import it normally: jest.requireMock() would return a second, separate copy.
const sqlite = expoSqlite as unknown as typeof import('../__mocks__/expo-sqlite');

const steps = (date: string, count: number) => ({
  source: 'healthConnect' as const,
  date,
  steps: count,
});

beforeEach(async () => {
  await closeDatabase();
  sqlite.__resetAllDatabases();
});

describe('schema', () => {
  it('creates the tables on first open and records the schema version', async () => {
    const db = await getDatabase();
    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    expect(tables.map((t) => t.name)).toEqual(
      expect.arrayContaining(['daily_steps', 'holding_changes', 'ledger_entries']),
    );
    expect(await db.getFirstAsync('PRAGMA user_version')).toEqual({
      user_version: SCHEMA_VERSION,
    });
  });

  it('does not rerun migrations on an up-to-date database', async () => {
    await insertLedgerEntry({ key: 'a', amount: 5, reason: 'test' });
    await migrate(await getDatabase());
    expect(await sumLedgerEntries()).toBe(5);
  });

  it('refuses a database written by a newer app version', async () => {
    const db = await getDatabase();
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION + 1}`);
    await expect(migrate(db)).rejects.toThrow(/newer than this app/);
  });
});

describe('daily steps', () => {
  it('stores one total per source and day, replacing earlier syncs', async () => {
    await saveDailySteps(steps('2026-11-17', 4000));
    await saveDailySteps(steps('2026-11-17', 9000));
    await saveDailySteps(steps('2026-11-18', 1200));

    expect(await getDailySteps(steps('2026-11-17', 0))).toMatchObject({
      key: 'healthConnect:2026-11-17',
      steps: 9000,
    });
    expect((await listDailySteps()).map((d) => d.date)).toEqual(['2026-11-18', '2026-11-17']);
    expect(await listDailySteps({ since: '2026-11-18' })).toHaveLength(1);
  });

  it('returns null for a day that was never synced', async () => {
    expect(await getDailySteps(steps('2026-01-01', 0))).toBeNull();
  });

  it('rejects negative step counts', async () => {
    await expect(saveDailySteps(steps('2026-11-18', -1))).rejects.toThrow();
  });
});

describe('ledger entries', () => {
  it('stores entries, lists them newest first and sums them', async () => {
    await insertLedgerEntry({ key: 'steps:1', amount: 50, reason: 'steps-reward' });
    await insertLedgerEntry({ key: 'buy:1', amount: -20, reason: 'asset-buy' });

    expect((await listLedgerEntries()).map((e) => e.key)).toEqual(['buy:1', 'steps:1']);
    expect(await getLedgerEntry('steps:1')).toMatchObject({ amount: 50, reason: 'steps-reward' });
    expect(await sumLedgerEntries()).toBe(30);
  });

  it('sums to 0 when there are no entries', async () => {
    expect(await sumLedgerEntries()).toBe(0);
  });

  it('stores nothing for a key that is already stored', async () => {
    expect(await insertLedgerEntry({ key: 'steps:1', amount: 50, reason: 'r' })).not.toBeNull();
    expect(await insertLedgerEntry({ key: 'steps:1', amount: 99, reason: 'r' })).toBeNull();
    expect(await listLedgerEntries()).toHaveLength(1);
    expect(await sumLedgerEntries()).toBe(50);
  });

  it('rejects a zero amount', async () => {
    await expect(insertLedgerEntry({ key: 'x', amount: 0, reason: 'r' })).rejects.toThrow();
  });

  it('offers no way to change or remove an entry (SEC-AUD-01)', () => {
    const names = Object.keys(persistence);
    expect(names.filter((n) => /ledger/i.test(n)).sort()).toEqual([
      'getLedgerEntry',
      'insertLedgerEntry',
      'listLedgerEntries',
      'sumLedgerEntries',
    ]);
    expect(names).not.toContain('getDatabase');
  });
});

describe('holding changes', () => {
  const buy = { asset: 'FLEX', units: 3, total: 30, cost: 30, realized: 0 };
  const sell = { asset: 'FLEX', units: -1, total: 15, cost: -10, realized: 5 };

  it('sums changes per asset and lists them newest first', async () => {
    await insertHoldingChange(buy);
    await insertHoldingChange(sell);
    await insertHoldingChange({ ...buy, asset: 'BOND', units: 1, total: 8, cost: 8 });

    expect(await getHoldingTotals('FLEX')).toEqual({
      asset: 'FLEX',
      units: 2,
      cost: 20,
      realized: 5,
    });
    expect((await listHoldingTotals()).map((t) => t.asset)).toEqual(['BOND', 'FLEX']);
    expect((await listHoldingChanges({ asset: 'FLEX' })).map((c) => c.units)).toEqual([-1, 3]);
    expect(await listHoldingChanges()).toHaveLength(3);
  });

  it('gives zero totals for an asset never traded', async () => {
    expect(await getHoldingTotals('NONE')).toEqual({
      asset: 'NONE',
      units: 0,
      cost: 0,
      realized: 0,
    });
  });

  it('rejects a change of zero units or a negative total', async () => {
    await expect(insertHoldingChange({ ...buy, units: 0 })).rejects.toThrow();
    await expect(insertHoldingChange({ ...buy, total: -1 })).rejects.toThrow();
  });

  it('offers no way to change or remove a holding change', () => {
    expect(
      Object.keys(persistence)
        .filter((n) => /holding/i.test(n))
        .sort(),
    ).toEqual([
      'getHoldingTotals',
      'insertHoldingChange',
      'listHoldingChanges',
      'listHoldingTotals',
    ]);
  });
});

describe('transactions', () => {
  it('commits every write together', async () => {
    await withTransaction(async (tx) => {
      await saveDailySteps(steps('2026-11-18', 8000), tx);
      await insertLedgerEntry({ key: 'steps:1', amount: 40, reason: 'steps-reward' }, tx);
    });
    expect(await sumLedgerEntries()).toBe(40);
    expect(await listDailySteps()).toHaveLength(1);
  });

  it('rolls every write back when the task throws', async () => {
    await expect(
      withTransaction(async (tx) => {
        await saveDailySteps(steps('2026-11-18', 8000), tx);
        await insertLedgerEntry({ key: 'steps:1', amount: 40, reason: 'steps-reward' }, tx);
        throw new Error('sync failed');
      }),
    ).rejects.toThrow('sync failed');
    expect(await listDailySteps()).toHaveLength(0);
    expect(await listLedgerEntries()).toHaveLength(0);
  });

  it('returns the task result', async () => {
    await expect(withTransaction(async () => 42)).resolves.toBe(42);
  });
});

describe('lifecycle', () => {
  it('keeps data after the app closes and reopens the database', async () => {
    await saveDailySteps(steps('2026-11-18', 8000));
    await insertLedgerEntry({ key: 'steps:1', amount: 40, reason: 'steps-reward' });
    await closeDatabase();

    expect(await sumLedgerEntries()).toBe(40);
    expect(await listDailySteps()).toHaveLength(1);
  });

  it('reset deletes everything and starts again from an empty schema', async () => {
    await insertLedgerEntry({ key: 'steps:1', amount: 40, reason: 'steps-reward' });
    await resetDatabase();

    expect(sqlite.deleteDatabaseAsync).toHaveBeenCalledWith('flexin.db');
    expect(await listLedgerEntries()).toHaveLength(0);
  });

  it('opens the database once for concurrent callers', async () => {
    const [a, b] = await Promise.all([getDatabase(), getDatabase()]);
    expect(a).toBe(b);
  });
});
