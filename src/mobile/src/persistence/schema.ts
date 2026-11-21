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
  // 2: portfolio holdings (MIS M9).
  `
  -- Every buy and sell of an asset. Rows are only ever inserted, so the units
  -- held, their cost and the lifetime gain on each asset are sums over this.
  CREATE TABLE holding_changes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    asset      INTEGER NOT NULL,                    -- asset id (Asset module)
    units      INTEGER NOT NULL CHECK (units <> 0), -- whole units: positive bought, negative sold
    total      REAL NOT NULL CHECK (total >= 0),    -- FLX paid (buy) or received (sell)
    cost       REAL NOT NULL,                       -- FLX change to the cost of the units held: +paid on a buy, -the sold units' share on a sell
    realized   REAL NOT NULL,                       -- FLX gain (negative: loss) the sale realized; 0 for a buy
    created_at TEXT NOT NULL
  );
  CREATE INDEX holding_changes_asset ON holding_changes (asset);
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;
