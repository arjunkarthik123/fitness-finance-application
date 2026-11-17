import { activityKey, dailyStepsKey, toLocalDate, toSyncPayload } from '@/integrations/sync';
import type { ActivitySample, DailySteps } from '@/integrations/types';

const run: ActivitySample = {
  source: 'healthConnect',
  id: 'abc-123',
  type: 'running',
  startTime: new Date('2026-11-05T14:00:00Z'),
  endTime: new Date('2026-11-05T14:30:00Z'),
  distanceMeters: 5000,
};

describe('activityKey', () => {
  it('is the same for the same workout on every sync', () => {
    expect(activityKey(run)).toBe('healthConnect:abc-123');
    const resynced: ActivitySample = { ...run, distanceMeters: 5100 };
    expect(activityKey(resynced)).toBe(activityKey(run));
  });

  it('differs across sources with the same provider id', () => {
    expect(activityKey({ ...run, source: 'strava' })).not.toBe(activityKey(run));
  });
});

describe('dailyStepsKey', () => {
  it('ignores the step count so a growing total keeps the same key', () => {
    const morning: DailySteps = { source: 'healthConnect', date: '2026-11-05', steps: 1200 };
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

describe('toSyncPayload', () => {
  it('serialises dates as ISO strings and adds keys', () => {
    const payload = toSyncPayload([run], [], 'America/Toronto');
    expect(payload.timeZone).toBe('America/Toronto');
    expect(payload.activities).toEqual([
      {
        ...run,
        key: 'healthConnect:abc-123',
        startTime: '2026-11-05T14:00:00.000Z',
        endTime: '2026-11-05T14:30:00.000Z',
      },
    ]);
  });

  it('sends each workout once even if a source reports it twice', () => {
    const payload = toSyncPayload([run, { ...run }], [], 'UTC');
    expect(payload.activities).toHaveLength(1);
  });

  it('keeps only the latest total for a day, so steps are never double counted', () => {
    const days: DailySteps[] = [
      { source: 'healthConnect', date: '2026-11-05', steps: 1200 },
      { source: 'healthConnect', date: '2026-11-05', steps: 9800 },
      { source: 'healthConnect', date: '2026-11-04', steps: 7000 },
    ];
    expect(toSyncPayload([], days, 'UTC').dailySteps).toEqual([
      { source: 'healthConnect', date: '2026-11-05', steps: 9800, key: 'healthConnect:2026-11-05' },
      { source: 'healthConnect', date: '2026-11-04', steps: 7000, key: 'healthConnect:2026-11-04' },
    ]);
  });
});
