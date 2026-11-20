import { activityKey, dailyStepsKey, toLocalDate } from '@/integrations/sync';
import type { ActivitySample, DailySteps } from '@/integrations/types';

const run: ActivitySample = {
  source: 'healthConnect',
  id: 'abc-123',
  type: 'running',
  startTime: new Date('2026-11-05T14:00:00Z'),
  endTime: new Date('2026-11-05T14:30:00Z'),
};

describe('activityKey', () => {
  it('is the same for the same workout on every sync', () => {
    expect(activityKey(run)).toBe('healthConnect:abc-123');
    const resynced: ActivitySample = { ...run, type: 'walking' };
    expect(activityKey(resynced)).toBe(activityKey(run));
  });

  it('differs across sources with the same provider id', () => {
    expect(activityKey({ ...run, source: 'garmin' })).not.toBe(activityKey(run));
  });
});

describe('dailyStepsKey', () => {
  it('ignores the step count so a growing total keeps the same key', () => {
    const morning: DailySteps = {
      source: 'healthConnect',
      date: '2026-11-05',
      steps: 1200,
      unverifiedSteps: 0,
    };
    const evening: DailySteps = { ...morning, steps: 9800 };
    expect(dailyStepsKey(evening)).toBe(dailyStepsKey(morning));
  });
});

describe('toLocalDate', () => {
  it('zero-pads month and day', () => {
    expect(toLocalDate(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });

  it('uses the local day, not the UTC day', () => {
    const lateEvening = new Date(2026, 10, 5, 23, 30);
    expect(toLocalDate(lateEvening)).toBe('2026-11-05');
  });
});
