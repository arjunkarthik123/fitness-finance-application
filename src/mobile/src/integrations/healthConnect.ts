import {
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  requestPermission,
  SdkAvailabilityStatus,
  type Permission,
} from 'react-native-health-connect';
import { Platform } from 'react-native';

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

// TODO(#327): data reads. See https://developer.android.com/health-and-fitness/health-connect
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
  async fetchActivities(_since: Date): Promise<ActivitySample[]> {
    return [];
  },
  async fetchDailySteps(_since: Date): Promise<DailySteps[]> {
    return [];
  },
};

/** Whether the user has already granted every permission Flexin needs. */
export async function hasHealthConnectPermissions(): Promise<boolean> {
  if (!(await healthConnect.isAvailable())) {
    return false;
  }
  return hasAllPermissions((await getGrantedPermissions()) as Permission[]);
}
