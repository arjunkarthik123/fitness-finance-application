/**
 * On-device schema, as an ordered list of migrations. The database's
 * `PRAGMA user_version` records how many have run, so each one runs exactly
 * once per install.
 *
 * Never edit a migration that is already on main: append a new one instead
 * (e.g. Asset and Portfolio adding `assets` and `holdings` tables).
 */
export const MIGRATIONS: readonly string[] = [
  // 1: daily step totals and the currency ledger.
  `
  CREATE TABLE daily_steps (
    key        TEXT PRIMARY KEY NOT NULL, -- "<source>:<YYYY-MM-DD>", see dailyStepsKey()
    source     TEXT NOT NULL,
    date       TEXT NOT NULL,             -- local calendar date on the device
    steps      INTEGER NOT NULL CHECK (steps >= 0),
    updated_at TEXT NOT NULL
  );

  -- Every coin movement. The balance is SUM(amount).
  CREATE TABLE ledger_entries (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    key        TEXT NOT NULL UNIQUE,                 -- caller's id for the change, e.g. "steps:healthConnect:2026-11-18:9000"
    amount     INTEGER NOT NULL CHECK (amount <> 0), -- positive credits, negative debits
    reason     TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;
