import * as expoSqlite from 'expo-sqlite';

import { getBalance } from '@/ledger';
import { getDailySteps, listLedgerEntries } from '@/persistence';
import { closeDatabase } from '@/persistence/database';
import {
  CAP_STEPS,
  creditDailySteps,
  DAILY_EARN_CAP,
  HEALTHY_DAILY_ACTIVITY,
  rewardForSteps,
} from '@/rewards';

const sqlite = expoSqlite as unknown as typeof import('../__mocks__/expo-sqlite');

const day = (date: string, steps: number) => ({
  source: 'healthConnect' as const,
  date,
  steps,
  unverifiedSteps: 0,
});

beforeEach(async () => {
  await closeDatabase();
  sqlite.__resetAllDatabases();
});

describe('rewardForSteps', () => {
  // 100 × (3x² − 2x³), x = steps / 15,000
  it.each([
    [0, 0],
    [1_000, 1.27],
    [5_000, 25.93],
    [7_500, 50],
    [8_000, 54.99],
    [10_000, 74.07],
    [15_000, 100],
    [40_000, 100],
  ])('%p steps earn %p FLX', (steps, flx) => {
    expect(rewardForSteps(steps, 100)).toBe(flx);
  });

  it('defaults to DailyEarnCap and is capped at CAP_STEPS', () => {
    expect(CAP_STEPS).toBe(15_000);
    expect(rewardForSteps(CAP_STEPS)).toBe(DAILY_EARN_CAP);
    expect(rewardForSteps(CAP_STEPS + 1)).toBe(DAILY_EARN_CAP);
  });

  it('scales with the cap', () => {
    expect(rewardForSteps(7_500, 1_000)).toBe(500);
    expect(rewardForSteps(10_000, 1_000)).toBe(740.74);
  });

  it('never decreases', () => {
    for (let s = 0; s < CAP_STEPS + 1_000; s += 250) {
      expect(rewardForSteps(s + 250)).toBeGreaterThanOrEqual(rewardForSteps(s));
    }
  });

  it('pays less per step past HealthyDailyActivity than below it (PR-SC-01)', () => {
    const below = rewardForSteps(HEALTHY_DAILY_ACTIVITY) / HEALTHY_DAILY_ACTIVITY;
    const above =
      (rewardForSteps(CAP_STEPS) - rewardForSteps(HEALTHY_DAILY_ACTIVITY)) /
      (CAP_STEPS - HEALTHY_DAILY_ACTIVITY);
    expect(above).toBeLessThan(below);
  });

  it('treats negative totals as 0', () => {
    expect(rewardForSteps(-500)).toBe(0);
  });
});

describe('creditDailySteps', () => {
  it('stores the totals and credits what they earn', async () => {
    const result = await creditDailySteps([day('2026-11-18', 10_000), day('2026-11-19', 5_000)]);
    const expected = rewardForSteps(10_000) + rewardForSteps(5_000);
    expect(result).toEqual({ credited: expected, balance: expected });
    expect(await getDailySteps(day('2026-11-18', 0))).toMatchObject({ steps: 10_000 });
    expect((await listLedgerEntries()).map((e) => e.key).sort()).toEqual([
      'steps:healthConnect:2026-11-18:10000',
      'steps:healthConnect:2026-11-19:5000',
    ]);
  });

  it('credits nothing on a repeat sync with no new steps', async () => {
    await creditDailySteps([day('2026-11-18', 8_000)]);
    expect(await creditDailySteps([day('2026-11-18', 8_000)])).toEqual({
      credited: 0,
      balance: rewardForSteps(8_000),
    });
    expect(await listLedgerEntries()).toHaveLength(1);
  });

  it('pays the same for one sync as for several smaller ones adding up to it', async () => {
    for (const steps of [1_000, 4_000, 8_000, 12_000]) {
      await creditDailySteps([day('2026-11-18', steps)]);
    }
    expect(await getBalance()).toBe(rewardForSteps(12_000));
  });

  it('credits only the increase over the stored total', async () => {
    await creditDailySteps([day('2026-11-18', 5_000)]);
    const result = await creditDailySteps([day('2026-11-18', 10_000)]);
    expect(result.credited).toBeCloseTo(rewardForSteps(10_000) - rewardForSteps(5_000), 2);
    expect(result.balance).toBe(rewardForSteps(10_000));
  });

  it('ignores a lower total, so the same steps never pay twice', async () => {
    await creditDailySteps([day('2026-11-18', 9_000)]);
    await creditDailySteps([day('2026-11-18', 6_000)]);
    await creditDailySteps([day('2026-11-18', 9_000)]);
    expect(await getBalance()).toBe(rewardForSteps(9_000));
    expect(await getDailySteps(day('2026-11-18', 0))).toMatchObject({ steps: 9_000 });
  });

  it('pays nothing more past CAP_STEPS but still stores the total', async () => {
    await creditDailySteps([day('2026-11-18', 15_000)]);
    expect(await creditDailySteps([day('2026-11-18', 20_000)])).toEqual({
      credited: 0,
      balance: DAILY_EARN_CAP,
    });
    expect(await getDailySteps(day('2026-11-18', 0))).toMatchObject({ steps: 20_000 });
  });

  it('caps each day separately', async () => {
    const result = await creditDailySteps([day('2026-11-18', 30_000), day('2026-11-19', 30_000)]);
    expect(result.balance).toBe(2 * DAILY_EARN_CAP);
  });
});
