import type { ActivitySample, DailySteps, FitnessIntegration } from './types';

// TODO: implement with the Strava API (https://developers.strava.com/).
export const strava: FitnessIntegration = {
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
