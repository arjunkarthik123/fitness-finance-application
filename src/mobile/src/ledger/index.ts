/**
 * Currency Ledger (MIS M6): the user's coin balance and every change to it.
 *
 * For the PoC this runs on the device on top of @/persistence. Long term the
 * ledger lives on the server (data on the phone can be tampered with), and
 * these functions become calls to the API. Keep them shaped for that: async,
 * plain values in and out, a key chosen by the caller so a retried request
 * can't apply twice, and errors with a `code` an API response can carry.
 *
 * Screens call these functions, never @/persistence. The optional `tx` is
 * only for other business modules (e.g. Asset buying) that must commit a
 * debit together with their own writes; on the server that becomes one
 * request handled entirely there.
 */
import {
  getLedgerEntry,
  insertLedgerEntry,
  sumLedgerEntries,
  withTransaction,
  type Transaction,
} from '@/persistence';

/** The lowest balance an account can hold. */
const MIN_BALANCE = 0;

export type LedgerErrorCode = 'InvalidAmount' | 'InsufficientFunds' | 'InvalidBalance';

export class LedgerError extends Error {
  constructor(
    readonly code: LedgerErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'LedgerError';
  }
}

export type BalanceChange = {
  /**
   * Unique id for this change, chosen by the caller (e.g.
   * `steps:healthConnect:2026-11-18:9000`, `asset-buy:<orderId>`). A key that
   * was already applied changes nothing, so retries are safe.
   */
  key: string;
  /** Why the coins moved, e.g. `steps-reward` or `asset-buy`. */
  reason: string;
};

/** The current balance in whole coins. */
export async function getBalance(tx?: Transaction): Promise<number> {
  const balance = await sumLedgerEntries(tx);
  if (balance < MIN_BALANCE) {
    throw new LedgerError('InvalidBalance', `Balance is ${balance}, below ${MIN_BALANCE}.`);
  }
  return balance;
}

/** Credits `amount` coins and returns the new balance. */
export function addBalance(
  amount: number,
  change: BalanceChange,
  tx?: Transaction,
): Promise<number> {
  return apply(amount, change, tx);
}

/**
 * Debits `amount` coins and returns the new balance. Throws
 * `InsufficientFunds`, changing nothing, if the balance would go below 0.
 */
export function subtractBalance(
  amount: number,
  change: BalanceChange,
  tx?: Transaction,
): Promise<number> {
  return apply(-amount, change, tx, amount);
}

/**
 * Records `delta` under `change.key`, unless that key was already applied.
 * `amount` is what the caller passed, checked before the sign is applied.
 */
async function apply(
  delta: number,
  change: BalanceChange,
  tx: Transaction | undefined,
  amount: number = delta,
): Promise<number> {
  if (!validAmount(amount)) {
    throw new LedgerError('InvalidAmount', `Amount must be a whole number ≥ 0, got ${amount}.`);
  }
  if (!tx) {
    return withTransaction((own) => apply(delta, change, own, amount));
  }

  const balance = await getBalance(tx);
  // Zero moves nothing, and a key that was already applied must not apply again.
  if (amount === 0 || (await getLedgerEntry(change.key, tx))) {
    return balance;
  }
  if (balance + delta < MIN_BALANCE) {
    throw new LedgerError(
      'InsufficientFunds',
      `Cannot take ${amount} coins from a balance of ${balance}.`,
    );
  }
  await insertLedgerEntry({ key: change.key, amount: delta, reason: change.reason }, tx);
  return balance + delta;
}

function validAmount(amount: number): boolean {
  return Number.isSafeInteger(amount) && amount >= 0;
}
