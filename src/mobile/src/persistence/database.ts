import * as SQLite from 'expo-sqlite';

import { MIGRATIONS, SCHEMA_VERSION } from './schema';

export const DATABASE_NAME = 'flexin.db';

/** The query methods the stores use. Both the database and a transaction provide them. */
export type Executor = Pick<SQLite.SQLiteDatabase, 'runAsync' | 'getFirstAsync' | 'getAllAsync'>;

/**
 * An open transaction, as seen outside this folder. It can only be passed back
 * to persistence functions, so code elsewhere can't run its own SQL with it.
 */
export type Transaction = { readonly __brand: 'Transaction' };

let opening: Promise<SQLite.SQLiteDatabase> | null = null;

/** Opens the database on first use and brings its schema up to date. */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!opening) {
    opening = open().catch((error: unknown) => {
      opening = null;
      throw error;
    });
  }
  return opening;
}

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await migrate(db);
  return db;
}

/** Runs every migration the database hasn't seen, each in its own transaction. */
export async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current > SCHEMA_VERSION) {
    throw new Error(
      `Database schema v${current} is newer than this app (v${SCHEMA_VERSION}). Reset the app data.`,
    );
  }
  for (let version = current + 1; version <= SCHEMA_VERSION; version++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version - 1]);
      await db.execAsync(`PRAGMA user_version = ${version}`);
    });
  }
}

/**
 * Runs `task` in one transaction: it all commits, or on a throw nothing does.
 * Pass `tx` to each persistence call that should be part of it.
 */
export async function withTransaction<T>(task: (tx: Transaction) => Promise<T>): Promise<T> {
  const db = await getDatabase();
  let result!: T;
  await db.withExclusiveTransactionAsync(async (txn) => {
    result = await task(txn as unknown as Transaction);
  });
  return result;
}

/** The executor for a call: the caller's transaction if given, else the database. */
export async function executor(tx?: Transaction): Promise<Executor> {
  return tx ? (tx as unknown as Executor) : getDatabase();
}

/** Closes the database. The next call opens it again. */
export async function closeDatabase(): Promise<void> {
  const pending = opening;
  opening = null;
  if (pending) {
    await (await pending).closeAsync();
  }
}

/** Deletes everything stored on the device. The next call starts from an empty schema. */
export async function resetDatabase(): Promise<void> {
  await closeDatabase();
  await SQLite.deleteDatabaseAsync(DATABASE_NAME);
}
