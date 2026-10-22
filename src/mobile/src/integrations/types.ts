/** A workout as reported by any fitness source, before currency is awarded. */
export type ActivitySample = {
  source: 'device' | 'healthConnect' | 'strava' | 'garmin';
  type: string;
  startTime: Date;
  endTime: Date;
  steps?: number;
  distanceMeters?: number;
  averageHeartRate?: number;
};

/** Common interface every fitness integration implements. */
export interface FitnessIntegration {
  isAvailable(): Promise<boolean>;
  requestPermissions(): Promise<boolean>;
  fetchActivities(since: Date): Promise<ActivitySample[]>;
}
