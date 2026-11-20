/**
 * Step rewards: daily step totals → FLX via the Currency Ledger.
 * Runs on the device for the PoC; becomes an API call later.
 */
import { dailyStepsKey } from '@/integrations/sync';
import type { DailySteps } from '@/integrations/types';
import { addBalance, getBalance } from '@/ledger';
import { getDailySteps, saveDailySteps, withTransaction } from '@/persistence';

export const HEALTHY_DAILY_ACTIVITY = 10_000;
export const CAP_STEPS = 1.5 * HEALTHY_DAILY_ACTIVITY;
/** Placeholder until the economy's scale is agreed; rewards scale with it. */
export const DAILY_EARN_CAP = 100;

/** Smoothstep S-curve: 0 at 0 steps, `cap` from CAP_STEPS on (PR-SC-01). */
export function rewardForSteps(steps: number, cap: number = DAILY_EARN_CAP): number {
  const x = Math.min(Math.max(steps, 0), CAP_STEPS) / CAP_STEPS;
  return round2(cap * (3 * x ** 2 - 2 * x ** 3));
}

export type CreditResult = { credited: number; balance: number };

/**
 * Stores each day's total and credits reward(new) − reward(stored), so
 * repeat syncs earn nothing (PR-PA-02). Lower totals are ignored.
 */
export async function creditDailySteps(days: DailySteps[]): Promise<CreditResult> {
  return withTransaction(async (tx) => {
    let credited = 0;
    for (const day of days) {
      const stored = (await getDailySteps(day, tx))?.steps ?? 0;
      if (day.steps <= stored) continue;

      await saveDailySteps(day, tx);
      const earned = round2(rewardForSteps(day.steps) - rewardForSteps(stored));
      if (earned > 0) {
        await addBalance(
          earned,
          { key: `steps:${dailyStepsKey(day)}:${day.steps}`, reason: 'steps-reward' },
          tx,
        );
        credited = round2(credited + earned);
      }
    }
    return { credited, balance: await getBalance(tx) };
  });
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
