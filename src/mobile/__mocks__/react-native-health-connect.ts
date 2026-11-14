/**
 * Shared Jest mock for react-native-health-connect, applied automatically to
 * every test (Jest picks up __mocks__ next to node_modules). The native module
 * can't load in Jest, so device calls are jest.fn()s with "available, nothing
 * granted, no data" defaults; tests override them per case. Constants and enums
 * are the library's real values so they can't drift from what ships.
 */
const constants = jest.requireActual('react-native-health-connect/lib/commonjs/constants');
const metadata = jest.requireActual(
  'react-native-health-connect/lib/commonjs/types/metadata.types',
);

export const { SdkAvailabilityStatus, ExerciseType } = constants;
export const { RecordingMethod, DeviceType } = metadata;

export const getSdkStatus = jest.fn(async () => SdkAvailabilityStatus.SDK_AVAILABLE);
export const initialize = jest.fn(async () => true);
export const requestPermission = jest.fn(async (permissions: unknown[]) => permissions);
export const getGrantedPermissions = jest.fn(async (): Promise<unknown[]> => []);
export const revokeAllPermissions = jest.fn(async () => undefined);
export const openHealthConnectSettings = jest.fn();
export const openHealthConnectDataManagement = jest.fn();
export const readRecords = jest.fn(
  async (): Promise<{ records: unknown[]; pageToken?: string }> => ({ records: [] }),
);
export const readRecord = jest.fn();
export const insertRecords = jest.fn(async (records: unknown[]) =>
  records.map((_, i) => `id-${i}`),
);
export const deleteRecordsByTimeRange = jest.fn(async () => undefined);
export const deleteRecordsByUuids = jest.fn(async () => undefined);
export const aggregateRecord = jest.fn();
export const aggregateGroupByDuration = jest.fn();
export const aggregateGroupByPeriod = jest.fn();
export const getChanges = jest.fn();
export const requestExerciseRoute = jest.fn();
