import * as expoSqlite from 'expo-sqlite';

import { addBalance, getBalance, LedgerError, subtractBalance } from '@/ledger';
import * as ledger from '@/ledger';
import { insertLedgerEntry, listLedgerEntries, withTransaction } from '@/persistence';
import { closeDatabase } from '@/persistence/database';

// expo-sqlite is mocked automatically by __mocks__/ (sql.js in memory).
const sqlite = expoSqlite as unknown as typeof import('../__mocks__/expo-sqlite');

const credit = (key: string) => ({ key, reason: 'steps-reward' });
const debit = (key: string) => ({ key, reason: 'asset-buy' });

const ledgerError = (code: string) => expect.objectContaining({ name: 'LedgerError', code });

beforeEach(async () => {
  await closeDatabase();
  sqlite.__resetAllDatabases();
});

describe('getBalance', () => {
  it('is 0 for a new account', async () => {
    expect(await getBalance()).toBe(0);
  });

  it('throws InvalidBalance if the stored entries sum below 0', async () => {
    await insertLedgerEntry({ key: 'tampered', amount: -5, reason: 'x' });
    await expect(getBalance()).rejects.toEqual(ledgerError('InvalidBalance'));
  });
});

describe('addBalance', () => {
  it('credits the amount and returns the new balance', async () => {
    expect(await addBalance(50, credit('a'))).toBe(50);
    expect(await addBalance(25, credit('b'))).toBe(75);
    expect(await getBalance()).toBe(75);
  });

  it('records each change as an entry with its key and reason', async () => {
    await addBalance(50, credit('steps:1'));
    expect(await listLedgerEntries()).toEqual([
      expect.objectContaining({ key: 'steps:1', amount: 50, reason: 'steps-reward' }),
    ]);
  });

  it.each([-1, 1.5, NaN, Infinity])(
    'throws InvalidAmount for %p and changes nothing',
    async (n) => {
      await expect(addBalance(n, credit('a'))).rejects.toEqual(ledgerError('InvalidAmount'));
      expect(await listLedgerEntries()).toHaveLength(0);
    },
  );

  it('accepts 0 without adding an entry', async () => {
    await addBalance(10, credit('a'));
    expect(await addBalance(0, credit('b'))).toBe(10);
    expect(await listLedgerEntries()).toHaveLength(1);
  });

  it('ignores a key that was already applied', async () => {
    await addBalance(50, credit('steps:1'));
    expect(await addBalance(50, credit('steps:1'))).toBe(50);
    expect(await addBalance(99, credit('steps:1'))).toBe(50);
    expect(await listLedgerEntries()).toHaveLength(1);
  });
});

describe('subtractBalance', () => {
  beforeEach(async () => {
    await addBalance(100, credit('seed'));
  });

  it('debits the amount and returns the new balance', async () => {
    expect(await subtractBalance(30, debit('buy:1'))).toBe(70);
    expect(await getBalance()).toBe(70);
    expect((await listLedgerEntries())[0]).toMatchObject({ key: 'buy:1', amount: -30 });
  });

  it('can spend the whole balance', async () => {
    expect(await subtractBalance(100, debit('buy:1'))).toBe(0);
  });

  it('refuses a debit that would go below 0 and changes nothing', async () => {
    await expect(subtractBalance(101, debit('buy:1'))).rejects.toEqual(
      ledgerError('InsufficientFunds'),
    );
    expect(await getBalance()).toBe(100);
    expect(await listLedgerEntries()).toHaveLength(1);
  });

  it.each([-1, 2.5])('throws InvalidAmount for %p and changes nothing', async (n) => {
    await expect(subtractBalance(n, debit('buy:1'))).rejects.toEqual(ledgerError('InvalidAmount'));
    expect(await getBalance()).toBe(100);
  });

  it('ignores a key that was already applied, even once funds are short', async () => {
    await subtractBalance(80, debit('buy:1'));
    expect(await subtractBalance(80, debit('buy:1'))).toBe(20);
    expect(await getBalance()).toBe(20);
  });

  it('commits together with other writes in a caller transaction, or not at all', async () => {
    await expect(
      withTransaction(async (tx) => {
        await subtractBalance(30, debit('buy:1'), tx);
        throw new Error('holding insert failed');
      }),
    ).rejects.toThrow('holding insert failed');
    expect(await getBalance()).toBe(100);

    await withTransaction(async (tx) => {
      expect(await subtractBalance(30, debit('buy:2'), tx)).toBe(70);
      expect(await getBalance(tx)).toBe(70);
    });
    expect(await getBalance()).toBe(70);
  });
});

describe('interface', () => {
  it('offers no way to change or remove an entry (SEC-AUD-01)', () => {
    expect(Object.keys(ledger).sort()).toEqual([
      'LedgerError',
      'addBalance',
      'getBalance',
      'subtractBalance',
    ]);
  });

  it('errors are LedgerError instances', async () => {
    await expect(addBalance(-1, credit('a'))).rejects.toBeInstanceOf(LedgerError);
  });
});
