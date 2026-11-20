import type { ActivitySample, DailySteps } from './types';

/** Stable dedupe key for a workout: the same workout always maps to the same key. */
export function activityKey(sample: Pick<ActivitySample, 'source' | 'id'>): string {
  return `${sample.source}:${sample.id}`;
}

/** Stable key for one source's step total on one local day. */
export function dailyStepsKey(day: Pick<DailySteps, 'source' | 'date'>): string {
  return `${day.source}:${day.date}`;
}

/** Local calendar date (`YYYY-MM-DD`) of `date` on this device. */
export function toLocalDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
