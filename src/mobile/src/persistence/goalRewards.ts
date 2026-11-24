/**
 * Storage for collected goal rewards. A goal with a row here is locked (MIS
 * M5 isLocked). Rows are only inserted, never changed. The FLX itself moves
 * through the Currency Ledger, which knows nothing about goals.
 */
import { executor, type Transaction } from './database';

export type GoalReward = { goalId: string; amount: number; collectedAt: string };

type Row = { goal_id: string; amount: number; collected_at: string };

/** The collected reward for `goalId`, or null if it was never collected. */
export async function getGoalReward(goalId: string, tx?: Transaction): Promise<GoalReward | null> {
  const row = await (
    await executor(tx)
  ).getFirstAsync<Row>('SELECT * FROM goal_rewards WHERE goal_id = ?', goalId);
  return row ? { goalId: row.goal_id, amount: row.amount, collectedAt: row.collected_at } : null;
}

/** Records that `goalId`'s reward was collected. Throws if it already was. */
export async function insertGoalReward(
  reward: Omit<GoalReward, 'collectedAt'>,
  tx?: Transaction,
  now: Date = new Date(),
): Promise<void> {
  await (
    await executor(tx)
  ).runAsync(
    'INSERT INTO goal_rewards (goal_id, amount, collected_at) VALUES (?, ?, ?)',
    reward.goalId,
    reward.amount,
    now.toISOString(),
  );
}
