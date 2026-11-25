/**
 * Step rewards: daily step totals → FLX via the Currency Ledger.
 * Runs on the device for the PoC; becomes an API call later.
 */
import { dailyStepsKey } from '@/integrations/sync';
import type { DailySteps } from '@/integrations/types';
import { addBalance, getBalance } from '@/ledger';
import {
  getDailySteps,
  listDailySteps,
  saveDailySteps,
  withTransaction,
  type Transaction,
} from '@/persistence';

export const HEALTHY_DAILY_ACTIVITY = 10_000;
export const CAP_STEPS = 1.5 * HEALTHY_DAILY_ACTIVITY;
/** Agreed at 200 FLX for now; every reward scales with it. */
export const DAILY_EARN_CAP = 200;

/** Smoothstep S-curve: 0 at 0 steps, `cap` from CAP_STEPS on (PR-SC-01). */
export function rewardForSteps(steps: number, cap: number = DAILY_EARN_CAP): number {
  const x = Math.min(Math.max(steps, 0), CAP_STEPS) / CAP_STEPS;
  return round2(cap * (3 * x ** 2 - 2 * x ** 3));
}

export type CreditResult = { credited: number; balance: number };

/**
 * Stores each source's daily total. A day earns reward(highest total across
 * sources), so two sources counting the same walk never pass DailyEarnCap
 * together; each sync credits only the increase, so repeat syncs earn nothing
 * (PR-PA-02). Lower totals are ignored.
 */
export async function creditDailySteps(days: DailySteps[]): Promise<CreditResult> {
  return withTransaction(async (tx) => {
    let credited = 0;
    for (const day of days) {
      const stored = (await getDailySteps(day, tx))?.steps ?? 0;
      if (day.steps <= stored) continue;

      const best = await highestTotal(day.date, tx);
      await saveDailySteps(day, tx);
      if (day.steps <= best) continue;
      const earned = round2(rewardForSteps(day.steps) - rewardForSteps(best));
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

/** The highest stored total for `date` across every source, or 0. */
async function highestTotal(date: string, tx: Transaction): Promise<number> {
  const stored = await listDailySteps({ since: date }, tx);
  return Math.max(0, ...stored.filter((d) => d.date === date).map((d) => d.steps));
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
