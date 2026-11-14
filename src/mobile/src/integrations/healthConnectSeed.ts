/**
 * DEV-ONLY test data for Health Connect, for devices that record no real steps
 * (tablets, emulators). Write access exists only in debug builds (see
 * plugins/with-health-connect-debug-write.js); never call this from release code.
 */
import {
  deleteRecordsByTimeRange,
  ExerciseType,
  insertRecords,
  RecordingMethod,
  requestPermission,
  type ExerciseSessionRecord,
  type Permission,
  type StepsRecord,
} from 'react-native-health-connect';

import { healthConnect } from './healthConnect';
import { toLocalDate } from './sync';

/** True only in development (Metro) builds; release builds strip the seed UI. */
export const isSeedToolEnabled = __DEV__;

export const SEED_DAYS = 7;

const SEED_WRITE_PERMISSIONS: Permission[] = [
  { accessType: 'write', recordType: 'Steps' },
  { accessType: 'write', recordType: 'ExerciseSession' },
];

/** Steps per day, oldest first; varied so charts and streaks look realistic. */
const DAILY_STEPS = [6200, 9800, 4300, 11250, 7600, 8900, 5400];

/** Step blocks per day: [startHour, endHour, share of the day's steps]. */
const BLOCKS: [number, number, number][] = [
  [8, 9, 0.3],
  [12, 13, 0.25],
  [17, 19, 0.45],
];

/** The manual entry #327's filter must drop. */
export const SEED_MANUAL_STEPS = 5000;

type SeedRecord = StepsRecord | ExerciseSessionRecord;

function at(day: Date, hour: number, minute = 0): Date {
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/**
 * Builds a week of seed records ending at `now`. Pure, so it can be unit tested.
 * Future intervals are skipped, so today only has the steps "walked so far".
 */
export function buildSeedRecords(now: Date, days = SEED_DAYS): SeedRecord[] {
  const records: SeedRecord[] = [];
  for (let back = days - 1; back >= 0; back--) {
    const day = new Date(now);
    day.setDate(now.getDate() - back);
    const date = toLocalDate(day);
    const total = DAILY_STEPS[(days - 1 - back) % DAILY_STEPS.length];

    BLOCKS.forEach(([startHour, endHour, share], i) => {
      const startTime = at(day, startHour);
      const endTime = at(day, endHour);
      if (endTime > now) return;
      records.push({
        recordType: 'Steps',
        count: Math.round(total * share),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        metadata: {
          clientRecordId: `flexin-seed:steps:${date}:${i}`,
          recordingMethod: RecordingMethod.RECORDING_METHOD_AUTOMATICALLY_RECORDED,
        },
      });
    });

    // A 30-minute run every other day, recorded as an active session.
    const runStart = at(day, 18);
    const runEnd = at(day, 18, 30);
    if (back % 2 === 0 && runEnd <= now) {
      records.push({
        recordType: 'ExerciseSession',
        exerciseType: ExerciseType.RUNNING,
        title: 'Seed run',
        startTime: runStart.toISOString(),
        endTime: runEnd.toISOString(),
        metadata: {
          clientRecordId: `flexin-seed:run:${date}`,
          recordingMethod: RecordingMethod.RECORDING_METHOD_ACTIVELY_RECORDED,
        },
      });
    }
  }

  // One manually entered block yesterday evening: must NOT earn currency.
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  records.push({
    recordType: 'Steps',
    count: SEED_MANUAL_STEPS,
    startTime: at(yesterday, 21).toISOString(),
    endTime: at(yesterday, 22).toISOString(),
    metadata: {
      clientRecordId: `flexin-seed:manual:${toLocalDate(yesterday)}`,
      recordingMethod: RecordingMethod.RECORDING_METHOD_MANUAL_ENTRY,
    },
  });

  return records;
}

/** Start of the seeded window: local midnight `days - 1` days before `now`. */
export function seedWindowStart(now: Date, days = SEED_DAYS): Date {
  const start = at(now, 0);
  start.setDate(start.getDate() - (days - 1));
  return start;
}

async function ensureWriteAccess(): Promise<void> {
  if (!isSeedToolEnabled) {
    throw new Error('Health Connect seeding is only available in development builds.');
  }
  if (!(await healthConnect.isAvailable())) {
    throw new Error('Health Connect is not available on this device.');
  }
  const granted = await requestPermission(SEED_WRITE_PERMISSIONS);
  const ok = SEED_WRITE_PERMISSIONS.every((need) =>
    granted.some(
      (have) =>
        'recordType' in have && have.recordType === need.recordType && have.accessType === 'write',
    ),
  );
  if (!ok) {
    throw new Error('Write permission for test data was not granted.');
  }
}

/** Writes the seed week into Health Connect. Re-running overwrites the same records. */
export async function seedHealthConnect(now = new Date()): Promise<number> {
  await ensureWriteAccess();
  const records = buildSeedRecords(now);
  // insertRecords only accepts one record type per call.
  for (const group of groupByRecordType(records)) {
    await insertRecords(group);
  }
  return records.length;
}

/** Splits records into one array per record type, keeping their order. */
export function groupByRecordType(records: SeedRecord[]): SeedRecord[][] {
  const groups = new Map<SeedRecord['recordType'], SeedRecord[]>();
  for (const record of records) {
    groups.set(record.recordType, [...(groups.get(record.recordType) ?? []), record]);
  }
  return [...groups.values()];
}

/** Deletes Flexin-written Steps and ExerciseSession records in the seed window. */
export async function clearSeedData(now = new Date()): Promise<void> {
  await ensureWriteAccess();
  const timeRangeFilter = {
    operator: 'between' as const,
    startTime: seedWindowStart(now).toISOString(),
    endTime: now.toISOString(),
  };
  // Health Connect only lets an app delete records it wrote itself.
  await deleteRecordsByTimeRange('Steps', timeRangeFilter);
  await deleteRecordsByTimeRange('ExerciseSession', timeRangeFilter);
}
