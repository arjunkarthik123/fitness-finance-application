import type { ActivitySample, FitnessIntegration } from './types';

// TODO: implement with the Android Health Connect (https://developer.android.com/health-and-fitness/health-connect).
export const healthConnect: FitnessIntegration = {
  async isAvailable() {
    return false;
  },
  async requestPermissions() {
    return false;
  },
  async fetchActivities(_since: Date): Promise<ActivitySample[]> {
    return [];
  },
};
