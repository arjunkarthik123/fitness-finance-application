import { activityKey, dailyStepsKey } from '@/integrations/sync';
import type { ActivitySample, DailySteps } from '@/integrations/types';

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
