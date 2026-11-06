import { RecordingMethod } from 'react-native-health-connect';

import {
  buildSeedRecords,
  groupByRecordType,
  SEED_DAYS,
  SEED_MANUAL_STEPS,
  seedWindowStart,
} from '@/integrations/healthConnectSeed';

// react-native-health-connect is mocked automatically by __mocks__/.
const MANUAL_ENTRY = RecordingMethod.RECORDING_METHOD_MANUAL_ENTRY;
const now = new Date(2026, 10, 6, 14, 0); // Nov 6, 2:00 pm local

describe('buildSeedRecords', () => {
  const records = buildSeedRecords(now);

  it('never writes data in the future', () => {
    expect(records.every((r) => new Date(r.endTime) <= now)).toBe(true);
  });

  it('only covers the seed window', () => {
    const start = seedWindowStart(now);
    expect(records.every((r) => new Date(r.startTime) >= start)).toBe(true);
    expect(start).toEqual(new Date(2026, 10, 6 - (SEED_DAYS - 1)));
  });

  it('includes exactly one manual entry for the filter to drop', () => {
    const manual = records.filter((r) => r.metadata?.recordingMethod === MANUAL_ENTRY);
    expect(manual).toHaveLength(1);
    expect(manual[0]).toMatchObject({ recordType: 'Steps', count: SEED_MANUAL_STEPS });
  });

  it('gives every record a unique client id so re-seeding overwrites, not duplicates', () => {
    const ids = records.map((r) => r.metadata?.clientRecordId);
    expect(new Set(ids).size).toBe(records.length);
    expect(buildSeedRecords(now).map((r) => r.metadata?.clientRecordId)).toEqual(ids);
  });

  it('includes both steps and exercise sessions', () => {
    expect(records.some((r) => r.recordType === 'Steps')).toBe(true);
    expect(records.some((r) => r.recordType === 'ExerciseSession')).toBe(true);
  });
});

describe('groupByRecordType', () => {
  it('gives insertRecords one record type per call, losing nothing', () => {
    const records = buildSeedRecords(now);
    const groups = groupByRecordType(records);
    expect(groups).toHaveLength(2);
    for (const group of groups) {
      expect(new Set(group.map((r) => r.recordType)).size).toBe(1);
    }
    expect(groups.flat()).toHaveLength(records.length);
  });
});
