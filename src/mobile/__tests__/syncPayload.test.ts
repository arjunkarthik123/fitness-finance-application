import { toSyncPayload } from '@/services/syncPayload';
import type { ActivitySample, DailySteps } from '@/integrations/types';

const run: ActivitySample = {
  source: 'healthConnect',
  id: 'abc-123',
  type: 'running',
  startTime: new Date('2026-11-05T14:00:00Z'),
  endTime: new Date('2026-11-05T14:30:00Z'),
};

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
      { source: 'healthConnect', date: '2026-11-05', steps: 1200, unverifiedSteps: 0 },
      { source: 'healthConnect', date: '2026-11-05', steps: 9800, unverifiedSteps: 0 },
      { source: 'healthConnect', date: '2026-11-04', steps: 7000, unverifiedSteps: 0 },
    ];
    expect(toSyncPayload([], days, 'UTC').dailySteps).toEqual([
      {
        source: 'healthConnect',
        date: '2026-11-05',
        steps: 9800,
        unverifiedSteps: 0,
        key: 'healthConnect:2026-11-05',
      },
      {
        source: 'healthConnect',
        date: '2026-11-04',
        steps: 7000,
        unverifiedSteps: 0,
        key: 'healthConnect:2026-11-04',
      },
    ]);
  });
});
