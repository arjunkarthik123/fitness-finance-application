import type { DailySteps, FitnessSource } from '@/integrations/types';
import { dailyStepsKey } from '@/integrations/sync';

import { executor, type Transaction } from './database';

export type StoredDailySteps = DailySteps & { key: string; updatedAt: string };

type Row = { key: string; source: string; date: string; steps: number; updated_at: string };

const fromRow = (row: Row): StoredDailySteps => ({
  key: row.key,
  source: row.source as FitnessSource,
  date: row.date,
  steps: row.steps,
  updatedAt: row.updated_at,
});

/** The stored total for one source and day, or null if that day was never synced. */
export async function getDailySteps(
  day: Pick<DailySteps, 'source' | 'date'>,
  tx?: Transaction,
): Promise<StoredDailySteps | null> {
  const row = await (
    await executor(tx)
  ).getFirstAsync<Row>('SELECT * FROM daily_steps WHERE key = ?', dailyStepsKey(day));
  return row ? fromRow(row) : null;
}

/** Stores a day's total, replacing any earlier total for the same source and day. */
export async function saveDailySteps(
  day: DailySteps,
  tx?: Transaction,
  now: Date = new Date(),
): Promise<void> {
  await (
    await executor(tx)
  ).runAsync(
    `INSERT INTO daily_steps (key, source, date, steps, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET steps = excluded.steps, updated_at = excluded.updated_at`,
    dailyStepsKey(day),
    day.source,
    day.date,
    day.steps,
    now.toISOString(),
  );
}

/** Stored days, newest first. With `since` (`YYYY-MM-DD`), only that day and later. */
export async function listDailySteps(
  options: { since?: string } = {},
  tx?: Transaction,
): Promise<StoredDailySteps[]> {
  const db = await executor(tx);
  const rows =
    options.since === undefined
      ? await db.getAllAsync<Row>('SELECT * FROM daily_steps ORDER BY date DESC, source')
      : await db.getAllAsync<Row>(
          'SELECT * FROM daily_steps WHERE date >= ? ORDER BY date DESC, source',
          options.since,
        );
  return rows.map(fromRow);
}
