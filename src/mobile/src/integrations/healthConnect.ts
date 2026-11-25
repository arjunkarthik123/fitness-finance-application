import {
  aggregateGroupByPeriod,
  ExerciseType,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  readRecords,
  RecordingMethod,
  requestPermission,
  SdkAvailabilityStatus,
  type Permission,
  type RecordResult,
} from 'react-native-health-connect';
import { Platform } from 'react-native';

import { toLocalDate } from './sync';
import type { ActivitySample, DailySteps, FitnessIntegration } from './types';

/**
 * Read-only permissions Flexin asks Health Connect for (least privilege).
 * Keep in sync with `android.permissions` in app.json.
 */
export const HEALTH_CONNECT_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'ExerciseSession' },
];

export type HealthConnectStatus = 'available' | 'unavailable' | 'update-required';

/** Whether Health Connect is installed and usable on this device. */
export async function getHealthConnectStatus(): Promise<HealthConnectStatus> {
  if (Platform.OS !== 'android') {
    return 'unavailable';
  }
  try {
    const status = await getSdkStatus();
    if (status === SdkAvailabilityStatus.SDK_AVAILABLE) {
      return 'available';
    }
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
      return 'update-required';
    }
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/** True only when every permission in `required` appears in `granted`. */
export function hasAllPermissions(granted: Permission[], required = HEALTH_CONNECT_PERMISSIONS) {
  return required.every((need) =>
    granted.some(
      (have) => have.accessType === need.accessType && have.recordType === need.recordType,
    ),
  );
}

/** Thrown when Health Connect can't be read; `message` is safe to show the user. */
export class HealthConnectReadError extends Error {}

const isManualEntry = (method?: RecordingMethod) =>
  method === RecordingMethod.RECORDING_METHOD_MANUAL_ENTRY;

const EXERCISE_NAMES = new Map<number, string>(
  Object.entries(ExerciseType).map(([name, value]) => [value, name.toLowerCase()]),
);

/** Maps an exercise session to an ActivitySample; null for manual entries or missing ids. */
export function toActivitySample(record: RecordResult<'ExerciseSession'>): ActivitySample | null {
  const id = record.metadata?.id;
  if (!id || isManualEntry(record.metadata?.recordingMethod)) {
    return null;
  }
  return {
    source: 'healthConnect',
    id,
    type: EXERCISE_NAMES.get(record.exerciseType) ?? 'other',
    startTime: new Date(record.startTime),
    endTime: new Date(record.endTime),
  };
}

/** Throws a HealthConnectReadError unless Health Connect is available and readable. */
async function ensureReadable(): Promise<void> {
  if (!(await healthConnect.isAvailable())) {
    throw new HealthConnectReadError('Health Connect is not available on this device.');
  }
  if (!(await hasHealthConnectPermissions())) {
    throw new HealthConnectReadError('Flexin does not have permission to read Health Connect.');
  }
}

/** Reads every record of `type` between `since` and now, following page tokens. */
async function readAll<T extends 'ExerciseSession'>(
  type: T,
  since: Date,
  now: Date,
): Promise<RecordResult<T>[]> {
  await ensureReadable();
  const records: RecordResult<T>[] = [];
  let pageToken: string | undefined;
  do {
    const page = await readRecords(type, {
      timeRangeFilter: {
        operator: 'between',
        startTime: since.toISOString(),
        endTime: now.toISOString(),
      },
      pageSize: 1000,
      pageToken,
    });
    records.push(...page.records);
    pageToken = page.pageToken || undefined;
  } while (pageToken);
  return records;
}

export const healthConnect: FitnessIntegration = {
  async isAvailable() {
    if ((await getHealthConnectStatus()) !== 'available') {
      return false;
    }
    return initialize();
  },
  async requestPermissions() {
    if (!(await this.isAvailable())) {
      return false;
    }
    const granted = await requestPermission(HEALTH_CONNECT_PERMISSIONS);
    return hasAllPermissions(granted as Permission[]);
  },
  async fetchActivities(since: Date): Promise<ActivitySample[]> {
    const records = await readAll('ExerciseSession', since, new Date());
    return records.map(toActivitySample).filter((s): s is ActivitySample => s !== null);
  },
  /**
   * Health Connect's own daily totals, the same numbers its Steps screen shows:
   * it removes duplicates across apps by the user's app priority. Every local
   * day from `since` to today is returned, 0 when there are no steps.
   */
  async fetchDailySteps(since: Date): Promise<DailySteps[]> {
    await ensureReadable();
    const now = new Date();
    // TODO(#333): pass dataOriginFilter with the trusted step apps once known.
    const groups = await aggregateGroupByPeriod({
      recordType: 'Steps',
      timeRangeFilter: {
        operator: 'between',
        startTime: since.toISOString(),
        endTime: now.toISOString(),
      },
      timeRangeSlicer: { period: 'DAYS', length: 1 },
    });
    // Group start times are local date-times ("2026-11-24T00:00").
    const totals = new Map(groups.map((g) => [g.startTime.slice(0, 10), g.result.COUNT_TOTAL]));
    const days: DailySteps[] = [];
    for (const day = new Date(since); toLocalDate(day) <= toLocalDate(now);) {
      const date = toLocalDate(day);
      days.push({
        source: 'healthConnect',
        date,
        steps: Math.round(totals.get(date) ?? 0),
        unverifiedSteps: 0,
      });
      day.setDate(day.getDate() + 1);
      day.setHours(0, 0, 0, 0);
    }
    return days;
  },
};

/** Whether the user has already granted every permission Flexin needs. */
export async function hasHealthConnectPermissions(): Promise<boolean> {
  if (!(await healthConnect.isAvailable())) {
    return false;
  }
  return hasAllPermissions((await getGrantedPermissions()) as Permission[]);
}
