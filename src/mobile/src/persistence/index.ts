/**
 * Persistence (MIS M2): storage only, no business rules. For the PoC everything
 * lives on the device in SQLite. Import from `@/persistence` only; ESLint
 * blocks `expo-sqlite` and the files in this folder everywhere else, so no
 * other code can run its own SQL.
 *
 * Screens should go through the modules built on this (e.g. the Currency
 * Ledger), so storage can move to the API later by changing those.
 */
export { resetDatabase, withTransaction, type Transaction } from './database';
export { getDailySteps, listDailySteps, saveDailySteps, type StoredDailySteps } from './dailySteps';
export {
  getLedgerEntry,
  insertLedgerEntry,
  listLedgerEntries,
  sumLedgerEntries,
  type LedgerEntry,
  type NewLedgerEntry,
} from './ledger';
