/**
 * Shared Jest mock for expo-sqlite, applied automatically to every test (Jest
 * picks up __mocks__ next to node_modules). The native module can't load in
 * Jest, so this runs the same SQL on sql.js (SQLite compiled to WebAssembly).
 * Databases live in memory, keyed by name, and outlive closeAsync() so tests
 * can check data survives a reopen. Call __resetAllDatabases() between tests.
 *
 * Only the methods the app uses are implemented.
 */
import initSqlJs, { type Database, type SqlJsStatic, type SqlValue } from 'sql.js';

type BindParams = SqlValue[] | Record<string, SqlValue>;

let sqlJs: Promise<SqlJsStatic> | null = null;
const files = new Map<string, Database>();

function toBindParams(params: unknown[]): BindParams {
  if (params.length === 1 && params[0] !== null && typeof params[0] === 'object') {
    return params[0] as BindParams;
  }
  return params as SqlValue[];
}

class MockSQLiteDatabase {
  private closed = false;

  constructor(
    readonly databaseName: string,
    private readonly db: Database,
  ) {}

  private live(): Database {
    if (this.closed) throw new Error(`Database ${this.databaseName} is closed`);
    return this.db;
  }

  async execAsync(source: string): Promise<void> {
    this.live().exec(source);
  }

  async runAsync(source: string, ...params: unknown[]) {
    const db = this.live();
    db.run(source, toBindParams(params));
    const changes = db.getRowsModified();
    const lastInsertRowId = Number(db.exec('SELECT last_insert_rowid()')[0].values[0][0]);
    return { changes, lastInsertRowId };
  }

  async getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]> {
    const statement = this.live().prepare(source);
    try {
      statement.bind(toBindParams(params));
      const rows: T[] = [];
      while (statement.step()) rows.push(statement.getAsObject() as T);
      return rows;
    } finally {
      statement.free();
    }
  }

  async getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null> {
    return (await this.getAllAsync<T>(source, ...params))[0] ?? null;
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    await this.withExclusiveTransactionAsync(task);
  }

  async withExclusiveTransactionAsync(task: (txn: this) => Promise<void>): Promise<void> {
    const db = this.live();
    db.exec('BEGIN');
    try {
      await task(this);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  async closeAsync(): Promise<void> {
    this.closed = true;
  }
}

export type SQLiteDatabase = MockSQLiteDatabase;

export const openDatabaseAsync = jest.fn(async (databaseName: string) => {
  sqlJs ??= initSqlJs();
  const SQL = await sqlJs;
  let file = files.get(databaseName);
  if (!file) {
    file = new SQL.Database();
    files.set(databaseName, file);
  }
  return new MockSQLiteDatabase(databaseName, file);
});

export const deleteDatabaseAsync = jest.fn(async (databaseName: string) => {
  files.get(databaseName)?.close();
  files.delete(databaseName);
});

/** Test helper: forget every database, as if the app was reinstalled. */
export function __resetAllDatabases(): void {
  for (const file of files.values()) file.close();
  files.clear();
}
