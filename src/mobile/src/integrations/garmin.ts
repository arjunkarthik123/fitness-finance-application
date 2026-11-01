import type { ActivitySample, FitnessIntegration } from './types';

// TODO: implement with the Garmin Connect IQ (https://developer.garmin.com/connect-iq/overview/).
export const garmin: FitnessIntegration = {
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
