import { Platform } from 'react-native';
import {
  aggregateGroupByPeriod,
  ExerciseType,
  getGrantedPermissions,
  getSdkStatus,
  RecordingMethod,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

import {
  getHealthConnectStatus,
  HEALTH_CONNECT_PERMISSIONS,
  hasAllPermissions,
  healthConnect,
  HealthConnectReadError,
  toActivitySample,
} from '@/integrations/healthConnect';

// react-native-health-connect is mocked automatically by __mocks__/.
const NOW = new Date(2026, 10, 6, 14, 0);
const SINCE = new Date(2026, 10, 6);
const at = (hour: number) => new Date(2026, 10, 6, hour).toISOString();

/** One day of Health Connect's daily totals, as aggregateGroupByPeriod returns it. */
const dayTotal = (date: string, count: number) => ({
  startTime: `${date}T00:00`,
  endTime: `${date}T23:59:59.999`,
  result: { COUNT_TOTAL: count, dataOrigins: ['com.example.phone'] },
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.useFakeTimers({ now: NOW });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('getHealthConnectStatus', () => {
  it.each([
    [SdkAvailabilityStatus.SDK_AVAILABLE, 'available'],
    [SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED, 'update-required'],
    [SdkAvailabilityStatus.SDK_UNAVAILABLE, 'unavailable'],
  ])('maps SDK status %i to %s', async (sdk, expected) => {
    jest.mocked(getSdkStatus).mockResolvedValueOnce(sdk);
    await expect(getHealthConnectStatus()).resolves.toBe(expected);
  });

  it('is unavailable when the status check throws', async () => {
    jest.mocked(getSdkStatus).mockRejectedValueOnce(new Error('boom'));
    await expect(getHealthConnectStatus()).resolves.toBe('unavailable');
  });

  it('is unavailable off Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await expect(getHealthConnectStatus()).resolves.toBe('unavailable');
    expect(getSdkStatus).not.toHaveBeenCalled();
  });
});

describe('permissions', () => {
  it('requires every permission, not just some', () => {
    expect(hasAllPermissions(HEALTH_CONNECT_PERMISSIONS)).toBe(true);
    expect(hasAllPermissions([HEALTH_CONNECT_PERMISSIONS[0]])).toBe(false);
    expect(hasAllPermissions([{ accessType: 'write', recordType: 'Steps' }])).toBe(false);
  });

  it('reports failure when the user grants only part of the request', async () => {
    jest.mocked(requestPermission).mockResolvedValueOnce([HEALTH_CONNECT_PERMISSIONS[0]]);
    await expect(healthConnect.requestPermissions()).resolves.toBe(false);
  });

  it('does not prompt when Health Connect is unavailable', async () => {
    jest.mocked(getSdkStatus).mockResolvedValueOnce(SdkAvailabilityStatus.SDK_UNAVAILABLE);
    await expect(healthConnect.requestPermissions()).resolves.toBe(false);
    expect(requestPermission).not.toHaveBeenCalled();
  });
});

describe('toActivitySample', () => {
  const session = {
    startTime: at(18),
    endTime: at(19),
    exerciseType: ExerciseType.RUNNING,
    metadata: {
      id: 'hc-1',
      recordingMethod: RecordingMethod.RECORDING_METHOD_ACTIVELY_RECORDED,
    },
  };

  it('maps a session with a readable type and the record id for dedupe', () => {
    expect(toActivitySample(session)).toEqual({
      source: 'healthConnect',
      id: 'hc-1',
      type: 'running',
      startTime: new Date(at(18)),
      endTime: new Date(at(19)),
    });
  });

  it('drops manually entered sessions and sessions without an id', () => {
    const manual = {
      ...session,
      metadata: { id: 'hc-2', recordingMethod: RecordingMethod.RECORDING_METHOD_MANUAL_ENTRY },
    };
    expect(toActivitySample(manual)).toBeNull();
    expect(toActivitySample({ ...session, metadata: {} })).toBeNull();
  });
});

describe('fetchDailySteps', () => {
  const grantAll = () =>
    jest.mocked(getGrantedPermissions).mockResolvedValueOnce(HEALTH_CONNECT_PERMISSIONS);

  it("returns Health Connect's daily totals for each day since `since`", async () => {
    grantAll();
    jest
      .mocked(aggregateGroupByPeriod)
      .mockResolvedValueOnce([dayTotal('2026-11-04', 7000), dayTotal('2026-11-06', 5557)]);

    await expect(healthConnect.fetchDailySteps(new Date(2026, 10, 4))).resolves.toEqual([
      { source: 'healthConnect', date: '2026-11-04', steps: 7000, unverifiedSteps: 0 },
      { source: 'healthConnect', date: '2026-11-05', steps: 0, unverifiedSteps: 0 },
      { source: 'healthConnect', date: '2026-11-06', steps: 5557, unverifiedSteps: 0 },
    ]);
    expect(aggregateGroupByPeriod).toHaveBeenCalledWith({
      recordType: 'Steps',
      timeRangeFilter: {
        operator: 'between',
        startTime: new Date(2026, 10, 4).toISOString(),
        endTime: NOW.toISOString(),
      },
      timeRangeSlicer: { period: 'DAYS', length: 1 },
    });
  });

  it('throws a readable error without permission', async () => {
    const result = healthConnect.fetchDailySteps(SINCE);
    await expect(result).rejects.toBeInstanceOf(HealthConnectReadError);
    await expect(result).rejects.toThrow('permission');
    expect(aggregateGroupByPeriod).not.toHaveBeenCalled();
  });

  it('throws a readable error when Health Connect is unavailable', async () => {
    jest.mocked(getSdkStatus).mockResolvedValueOnce(SdkAvailabilityStatus.SDK_UNAVAILABLE);
    await expect(healthConnect.fetchDailySteps(SINCE)).rejects.toThrow('not available');
  });
});
