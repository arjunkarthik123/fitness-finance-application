import * as expoSqlite from 'expo-sqlite';

import {
  collectReward,
  completionOf,
  currentGoal,
  getGoalStatus,
  GoalError,
  rewardFor,
  rewardMultiplier,
  type Goal,
} from '@/goals';
import type { FitnessSource } from '@/integrations/types';
import { getBalance } from '@/ledger';
import { getGoalReward, listLedgerEntries, saveDailySteps } from '@/persistence';
import { closeDatabase } from '@/persistence/database';

const sqlite = expoSqlite as unknown as typeof import('../__mocks__/expo-sqlite');

// Wednesday 18 November 2026; its week runs Monday 16 to Sunday 22.
const NOW = new Date(2026, 10, 18, 12);
const goal: Goal = currentGoal(NOW);

const steps = (date: string, count: number, source: FitnessSource = 'healthConnect') =>
  saveDailySteps({ source, date, steps: count });

beforeEach(async () => {
  await closeDatabase();
  sqlite.__resetAllDatabases();
});

describe('currentGoal', () => {
  it('runs Monday to Sunday of the current week', () => {
    expect(goal.period).toEqual({ start: '2026-11-16', end: '2026-11-22' });
    expect(goal.id).toBe('weekly-steps:2026-11-16');
    expect(currentGoal(new Date(2026, 10, 16, 0, 0)).period.start).toBe('2026-11-16');
    expect(currentGoal(new Date(2026, 10, 22, 23, 59)).period.start).toBe('2026-11-16');
    expect(currentGoal(new Date(2026, 10, 23, 0, 1)).period.start).toBe('2026-11-23');
  });
});

describe('rewardMultiplier', () => {
  it.each([
    [0, 0],
    [0.2499, 0],
    [0.25, 0.5],
    [0.4999, 0.5],
    [0.5, 0.75],
    [0.75, 1],
    [0.9999, 1],
    [1, 1.25],
  ])('%p of the goal pays %p×', (completion, multiplier) => {
    expect(rewardMultiplier(completion)).toBe(multiplier);
  });

  it('never decreases', () => {
    for (let c = 0; c < 1; c += 0.01) {
      expect(rewardMultiplier(c + 0.01)).toBeGreaterThanOrEqual(rewardMultiplier(c));
    }
  });
});

describe('completionOf / rewardFor', () => {
  it('caps completion at 1 and floors it at 0', () => {
    expect(completionOf(75_000, 50_000)).toBe(1);
    expect(completionOf(-10, 50_000)).toBe(0);
  });

  it.each([
    [0, 0],
    [12_499, 0],
    [12_500, 50],
    [25_000, 75],
    [37_500, 100],
    [50_000, 125],
    [90_000, 125],
  ])('%p steps of a 50,000 step goal pay %p FLX', (progress, flx) => {
    expect(rewardFor(goal, progress)).toBe(flx);
  });
});

describe('getGoalStatus', () => {
  it('sums the days inside the period only', async () => {
    await steps('2026-11-15', 20_000); // the Sunday before
    await steps('2026-11-16', 10_000);
    await steps('2026-11-18', 6_000);
    await steps('2026-11-23', 20_000); // the Monday after
    const status = await getGoalStatus(goal);
    expect(status).toMatchObject({
      progress: 16_000,
      completion: 0.32,
      multiplier: 0.5,
      reward: 50,
      locked: false,
      collected: null,
      nextTier: { minCompletion: 0.5, multiplier: 0.75, progressNeeded: 9_000 },
    });
  });

  it('counts the highest total per day across sources, not the sum', async () => {
    await steps('2026-11-16', 10_000, 'healthConnect');
    await steps('2026-11-16', 8_000, 'garmin');
    expect((await getGoalStatus(goal)).progress).toBe(10_000);
  });

  it('has no next tier once complete', async () => {
    await steps('2026-11-16', 50_000);
    expect(await getGoalStatus(goal)).toMatchObject({ multiplier: 1.25, nextTier: null });
  });
});

describe('collectReward', () => {
  it('credits the reward for the tier reached and locks the goal', async () => {
    await steps('2026-11-16', 26_000);
    expect(await collectReward(goal)).toEqual({ credited: 75, balance: 75 });
    expect(await getGoalStatus(goal)).toMatchObject({ locked: true, collected: 75, reward: 0 });
    expect(await getGoalReward(goal.id)).toMatchObject({ goalId: goal.id, amount: 75 });
    // The ledger only gets a plain credit; it stores nothing about the goal itself.
    expect(await listLedgerEntries()).toEqual([
      expect.objectContaining({
        key: 'goal:weekly-steps:2026-11-16',
        amount: 75,
        reason: 'goal-reward',
      }),
    ]);
  });

  it('cannot be collected twice, even after more progress', async () => {
    await steps('2026-11-16', 13_000);
    await collectReward(goal);
    await steps('2026-11-17', 40_000);
    await expect(collectReward(goal)).rejects.toMatchObject({ code: 'GoalLocked' });
    expect(await getBalance()).toBe(50);
  });

  it('pays nothing below the lowest tier', async () => {
    await steps('2026-11-16', 12_000);
    const attempt = collectReward(goal);
    await expect(attempt).rejects.toBeInstanceOf(GoalError);
    await expect(attempt).rejects.toMatchObject({ code: 'NothingToCollect' });
    expect(await listLedgerEntries()).toHaveLength(0);
    expect(await getGoalReward(goal.id)).toBeNull();
  });

  it("is per week: next week's goal starts unlocked", async () => {
    await steps('2026-11-16', 50_000);
    await collectReward(goal);
    const next = currentGoal(new Date(2026, 10, 25));
    expect(await getGoalStatus(next)).toMatchObject({ progress: 0, locked: false });
  });
});
