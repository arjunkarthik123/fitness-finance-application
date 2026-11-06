import type { ActivitySample, DailySteps } from './types';

/**
 * Shape the app sends to the backend activity sync endpoint (proposed; see #326).
 * The backend must treat it as idempotent:
 * - activities: insert by `key`, ignore keys it has already seen
 * - dailySteps: upsert by `key`, replacing the previous total, and award
 *   currency only on the increase
 */
export type ActivitySyncPayload = {
  /** IANA time zone of the device, e.g. "America/Toronto". Defines the local days. */
  timeZone: string;
  activities: (Omit<ActivitySample, 'startTime' | 'endTime'> & {
    key: string;
    startTime: string;
    endTime: string;
  })[];
  dailySteps: (DailySteps & { key: string })[];
};

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

/** Builds the sync payload, dropping duplicate keys (the last occurrence wins). */
export function toSyncPayload(
  activities: ActivitySample[],
  dailySteps: DailySteps[],
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): ActivitySyncPayload {
  const byActivityKey = new Map(activities.map((a) => [activityKey(a), a]));
  const byDayKey = new Map(dailySteps.map((d) => [dailyStepsKey(d), d]));
  return {
    timeZone,
    activities: [...byActivityKey].map(([key, a]) => ({
      ...a,
      key,
      startTime: a.startTime.toISOString(),
      endTime: a.endTime.toISOString(),
    })),
    dailySteps: [...byDayKey].map(([key, d]) => ({ ...d, key })),
  };
}
