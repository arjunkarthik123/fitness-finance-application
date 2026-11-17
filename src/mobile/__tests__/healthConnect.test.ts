import { Platform } from 'react-native';
import {
  ExerciseType,
  getGrantedPermissions,
  getSdkStatus,
  readRecords,
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
  toStepInterval,
} from '@/integrations/healthConnect';

// react-native-health-connect is mocked automatically by __mocks__/.
const NOW = new Date(2026, 10, 6, 14, 0);
const SINCE = new Date(2026, 10, 6);
const at = (hour: number) => new Date(2026, 10, 6, hour).toISOString();

const steps = (startHour: number, endHour: number, count: number, method?: RecordingMethod) => ({
  startTime: at(startHour),
  endTime: at(endHour),
  count,
  metadata: { dataOrigin: 'com.example.phone', recordingMethod: method },
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

describe('toStepInterval', () => {
  it('maps a record and flags manual entries', () => {
    const manual = toStepInterval(steps(8, 9, 500, RecordingMethod.RECORDING_METHOD_MANUAL_ENTRY));
    expect(manual).toEqual({
      origin: 'com.example.phone',
      start: new Date(at(8)),
      end: new Date(at(9)),
      count: 500,
      manualEntry: true,
    });
    const auto = toStepInterval(
      steps(8, 9, 500, RecordingMethod.RECORDING_METHOD_AUTOMATICALLY_RECORDED),
    );
    expect(auto.manualEntry).toBe(false);
  });

  it('uses "unknown" when the record has no origin', () => {
    expect(toStepInterval({ startTime: at(8), endTime: at(9), count: 1 }).origin).toBe('unknown');
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

  it('follows page tokens until every page is read', async () => {
    grantAll();
    jest
      .mocked(readRecords)
      .mockResolvedValueOnce({ records: [steps(8, 9, 1000)], pageToken: 'page-2' })
      .mockResolvedValueOnce({ records: [steps(12, 13, 500)] });

    await expect(healthConnect.fetchDailySteps(SINCE)).resolves.toEqual([
      { source: 'healthConnect', date: '2026-11-06', steps: 1500 },
    ]);
    expect(readRecords).toHaveBeenCalledTimes(2);
    expect(jest.mocked(readRecords).mock.calls[1][1]).toMatchObject({ pageToken: 'page-2' });
  });

  it('leaves manual entries out of the total', async () => {
    grantAll();
    jest.mocked(readRecords).mockResolvedValueOnce({
      records: [
        steps(8, 9, 1000),
        steps(10, 11, 5000, RecordingMethod.RECORDING_METHOD_MANUAL_ENTRY),
      ],
    });
    const [today] = await healthConnect.fetchDailySteps(SINCE);
    expect(today.steps).toBe(1000);
  });

  it('throws a readable error without permission', async () => {
    const result = healthConnect.fetchDailySteps(SINCE);
    await expect(result).rejects.toBeInstanceOf(HealthConnectReadError);
    await expect(result).rejects.toThrow('permission');
    expect(readRecords).not.toHaveBeenCalled();
  });

  it('throws a readable error when Health Connect is unavailable', async () => {
    jest.mocked(getSdkStatus).mockResolvedValueOnce(SdkAvailabilityStatus.SDK_UNAVAILABLE);
    await expect(healthConnect.fetchDailySteps(SINCE)).rejects.toThrow('not available');
  });
});
