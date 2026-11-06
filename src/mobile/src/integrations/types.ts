/** Where a piece of fitness data came from. */
export type FitnessSource = 'device' | 'healthConnect' | 'strava' | 'garmin';

/** A workout as reported by any fitness source, before currency is awarded. */
export type ActivitySample = {
  source: FitnessSource;
  /** The provider's own id for this workout. Stable across syncs; used to dedupe. */
  id: string;
  type: string;
  startTime: Date;
  endTime: Date;
  steps?: number;
  distanceMeters?: number;
  averageHeartRate?: number;
};

/**
 * Total steps for one local calendar day from one source. A day's total grows
 * as the user keeps walking, so a later sync replaces an earlier one for the
 * same source and date.
 */
export type DailySteps = {
  source: FitnessSource;
  /** Local calendar date on the device, `YYYY-MM-DD`. */
  date: string;
  steps: number;
};

/** Common interface every fitness integration implements. */
export interface FitnessIntegration {
  isAvailable(): Promise<boolean>;
  requestPermissions(): Promise<boolean>;
  fetchActivities(since: Date): Promise<ActivitySample[]>;
  /** Daily step totals for each local day from `since` up to and including today. */
  fetchDailySteps(since: Date): Promise<DailySteps[]>;
}
