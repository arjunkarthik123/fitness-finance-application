/**
 * Goals (MIS M5), PoC version: one hardcoded weekly step goal. Progress comes
 * from the daily step totals already stored on the device, and the reward is
 * paid through the Currency Ledger.
 *
 * The reward is a step function of how much of the goal is done: reaching
 * 25% pays 0.5× the goal's base reward, 50% pays 0.75×, and so on (see
 * REWARD_TIERS). Collecting the reward locks the goal (MIS `isLocked`), so it
 * can only be collected once. The lock is this module's own record
 * (`goal_rewards`); the FLX is paid with the ledger's generic addBalance, so
 * the Currency Ledger never has to know what a goal is.
 *
 * Creating, editing and deleting goals (createGoal, updateGoalMst, …) is out
 * of scope for the PoC.
 */
import { toLocalDate } from '@/integrations/sync';
import { addBalance } from '@/ledger';
import {
  getGoalReward,
  insertGoalReward,
  listDailySteps,
  withTransaction,
  type Transaction,
} from '@/persistence';

export type Goal = {
  /** Stable id; also the ledger key suffix, so a goal can only pay once. */
  id: string;
  title: string;
  activityType: 'steps';
  /** The activity measurement that counts as 100%. */
  target: number;
  /** Inclusive local dates, `YYYY-MM-DD`. */
  period: { start: string; end: string };
  /** FLX paid at a 1× multiplier. */
  baseReward: number;
};

export type RewardTier = { minCompletion: number; multiplier: number };

/**
 * Piecewise reward multiplier, highest tier first. Below the lowest tier the
 * goal pays nothing. Placeholder values until the economy's scale is agreed.
 */
export const REWARD_TIERS: readonly RewardTier[] = [
  { minCompletion: 1, multiplier: 1.25 },
  { minCompletion: 0.75, multiplier: 1 },
  { minCompletion: 0.5, multiplier: 0.75 },
  { minCompletion: 0.25, multiplier: 0.5 },
];

export const WEEKLY_STEP_TARGET = 50_000;
export const GOAL_BASE_REWARD = 100;

/** The one goal the PoC shows: walk WEEKLY_STEP_TARGET steps this week (Monday to Sunday). */
export function currentGoal(now: Date = new Date()): Goal {
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const start = toLocalDate(monday);
  return {
    id: `weekly-steps:${start}`,
    title: `Walk ${WEEKLY_STEP_TARGET.toLocaleString('en-US')} steps this week`,
    activityType: 'steps',
    target: WEEKLY_STEP_TARGET,
    period: { start, end: toLocalDate(sunday) },
    baseReward: GOAL_BASE_REWARD,
  };
}

/** Share of the goal done, from 0 to 1. Going past the target counts as 1. */
export function completionOf(progress: number, target: number): number {
  if (target <= 0) return 1;
  return Math.min(Math.max(progress, 0) / target, 1);
}

/** The tier reached at `completion` (0–1), or null below the lowest tier. */
export function tierFor(completion: number): RewardTier | null {
  return REWARD_TIERS.find((t) => completion >= t.minCompletion) ?? null;
}

export function rewardMultiplier(completion: number): number {
  return tierFor(completion)?.multiplier ?? 0;
}

/** FLX the goal pays for `progress`. */
export function rewardFor(goal: Goal, progress: number): number {
  return round2(goal.baseReward * rewardMultiplier(completionOf(progress, goal.target)));
}

export type GoalStatus = {
  goal: Goal;
  progress: number;
  completion: number;
  multiplier: number;
  /** What collecting now pays (0 below the lowest tier, or once collected). */
  reward: number;
  /** The next tier up and the progress it needs, or null at the top tier. */
  nextTier: (RewardTier & { progressNeeded: number }) | null;
  /** True once the reward was collected; the goal can then only be viewed. */
  locked: boolean;
  /** FLX paid when the reward was collected. */
  collected: number | null;
};

export type GoalErrorCode = 'GoalLocked' | 'NothingToCollect';

export class GoalError extends Error {
  constructor(
    readonly code: GoalErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GoalError';
  }
}

/** Progress, tier and reward for `goal`. */
export async function getGoalStatus(
  goal: Goal = currentGoal(),
  tx?: Transaction,
): Promise<GoalStatus> {
  const [progress, collected] = await Promise.all([
    progressOf(goal, tx),
    getGoalReward(goal.id, tx),
  ]);
  const completion = completionOf(progress, goal.target);
  const multiplier = rewardMultiplier(completion);
  const next = [...REWARD_TIERS].reverse().find((t) => t.minCompletion > completion) ?? null;
  return {
    goal,
    progress,
    completion,
    multiplier,
    reward: collected ? 0 : rewardFor(goal, progress),
    nextTier: next && {
      ...next,
      progressNeeded: Math.ceil(next.minCompletion * goal.target - progress),
    },
    locked: collected !== null,
    collected: collected?.amount ?? null,
  };
}

/**
 * Pays the reward for the tier reached so far and locks the goal (MIS
 * collectReward). Throws `GoalLocked` if it was already collected and
 * `NothingToCollect` below the lowest tier.
 */
export async function collectReward(
  goal: Goal = currentGoal(),
): Promise<{ credited: number; balance: number }> {
  return withTransaction(async (tx) => {
    const status = await getGoalStatus(goal, tx);
    if (status.locked) {
      throw new GoalError('GoalLocked', 'This goal was already collected.');
    }
    if (status.reward <= 0) {
      const lowest = REWARD_TIERS[REWARD_TIERS.length - 1].minCompletion;
      throw new GoalError(
        'NothingToCollect',
        `Reach ${lowest * 100}% of the goal to earn a reward.`,
      );
    }
    await insertGoalReward({ goalId: goal.id, amount: status.reward }, tx);
    // The ledger only sees an amount, a unique key and a reason string.
    const balance = await addBalance(
      status.reward,
      { key: rewardKey(goal), reason: 'goal-reward' },
      tx,
    );
    return { credited: status.reward, balance };
  });
}

/**
 * Steps in the goal's period. Each day counts its highest total across
 * sources, so the same walk reported by two sources isn't counted twice.
 */
async function progressOf(goal: Goal, tx?: Transaction): Promise<number> {
  const days = await listDailySteps({ since: goal.period.start }, tx);
  const byDate = new Map<string, number>();
  for (const day of days) {
    if (day.date > goal.period.end) continue;
    byDate.set(day.date, Math.max(byDate.get(day.date) ?? 0, day.steps));
  }
  let total = 0;
  for (const steps of byDate.values()) total += steps;
  return total;
}

function rewardKey(goal: Goal): string {
  return `goal:${goal.id}`;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
