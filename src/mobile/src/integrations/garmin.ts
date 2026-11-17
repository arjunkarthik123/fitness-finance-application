import type { ActivitySample, DailySteps, FitnessIntegration } from './types';

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
  async fetchDailySteps(_since: Date): Promise<DailySteps[]> {
    return [];
  },
};
