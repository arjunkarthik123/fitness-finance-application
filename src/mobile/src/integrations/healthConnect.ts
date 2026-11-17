import {
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

import { toDailySteps, type StepInterval } from './stepBuckets';
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

/** Maps a Health Connect steps record to the source-independent interval type. */
export function toStepInterval(record: RecordResult<'Steps'>): StepInterval {
  return {
    origin: record.metadata?.dataOrigin ?? 'unknown',
    start: new Date(record.startTime),
    end: new Date(record.endTime),
    count: record.count,
    manualEntry: isManualEntry(record.metadata?.recordingMethod),
  };
}

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

/** Reads every record of `type` between `since` and now, following page tokens. */
async function readAll<T extends 'Steps' | 'ExerciseSession'>(
  type: T,
  since: Date,
  now: Date,
): Promise<RecordResult<T>[]> {
  if (!(await healthConnect.isAvailable())) {
    throw new HealthConnectReadError('Health Connect is not available on this device.');
  }
  if (!(await hasHealthConnectPermissions())) {
    throw new HealthConnectReadError('Flexin does not have permission to read Health Connect.');
  }
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
  async fetchDailySteps(since: Date): Promise<DailySteps[]> {
    const now = new Date();
    const records = await readAll('Steps', since, now);
    // TODO(#333): restrict to trusted dataOrigins once known; recordingMethod is
    // self-reported by the writing app, so it alone cannot stop spoofed steps.
    return toDailySteps(records.map(toStepInterval), since, now, 'healthConnect');
  },
};

/** Whether the user has already granted every permission Flexin needs. */
export async function hasHealthConnectPermissions(): Promise<boolean> {
  if (!(await healthConnect.isAvailable())) {
    return false;
  }
  return hasAllPermissions((await getGrantedPermissions()) as Permission[]);
}
