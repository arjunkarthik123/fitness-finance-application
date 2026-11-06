import { rejectReason, toDailySteps, type StepInterval } from '@/integrations/stepBuckets';

const PHONE = 'com.example.phone';
const WATCH = 'com.example.watch';

/** A step record on Nov `day`, 2026, local time; hours may be fractional. */
function rec(
  origin: string,
  startHour: number,
  endHour: number,
  count: number,
  { day = 6, manualEntry = false } = {},
): StepInterval {
  const at = (h: number) => new Date(2026, 10, day, 0, Math.round(h * 60));
  return { origin, start: at(startHour), end: at(endHour), count, manualEntry };
}

const since = new Date(2026, 10, 6);
const now = new Date(2026, 10, 6, 23, 59);
const total = (intervals: StepInterval[]) =>
  toDailySteps(intervals, since, now, 'healthConnect')[0].steps;

describe('toDailySteps', () => {
  it('equals the plain sum for a single source', () => {
    expect(total([rec(PHONE, 8, 8.5, 1200), rec(PHONE, 12, 12.25, 800)])).toBe(2000);
  });

  it('counts a walk recorded by two devices once', () => {
    expect(total([rec(PHONE, 8, 8.5, 3000), rec(WATCH, 8, 8.5, 3100)])).toBe(3100);
  });

  it('counts both when the phone records the morning and the watch the afternoon', () => {
    expect(total([rec(PHONE, 8, 9, 4000), rec(WATCH, 15, 16, 5000)])).toBe(9000);
  });

  it('does not let a long record inflate a walk a finer source already counted', () => {
    // Phone: 1,000 steps in 15 min. Watch: the same 1,000 spread over 2 hours.
    // Naive per-bucket max would give 1,000 + 7 x 125 = 1,875.
    expect(total([rec(PHONE, 8, 8.25, 1000), rec(WATCH, 8, 10, 1000)])).toBe(1000);
  });

  it('adds only the extra steps a long record saw beyond the finer source', () => {
    expect(total([rec(PHONE, 8, 8.25, 1000), rec(WATCH, 8, 10, 2500)])).toBe(2500);
  });

  it('counts a long record in full when nothing else covers its span', () => {
    expect(total([rec(WATCH, 17, 19, 4005)])).toBe(4005);
  });

  it('drops manual entries', () => {
    const manual = rec(PHONE, 21, 22, 5000, { manualEntry: true });
    expect(rejectReason(manual)).toBe('manual-entry');
    expect(total([rec(PHONE, 8, 9, 3000), manual])).toBe(3000);
  });

  it('drops physically impossible records', () => {
    const tooFast = rec(PHONE, 8, 8.25, 50_000); // ~3,300 steps a minute
    expect(rejectReason(tooFast)).toBe('implausible-rate');
    expect(rejectReason(rec(PHONE, 9, 9, 10))).toBe('invalid-interval');
    expect(total([tooFast, rec(PHONE, 9, 9.5, 2000)])).toBe(2000);
  });

  it('splits a record that crosses midnight between the two days', () => {
    const overnight = rec(PHONE, 23.5, 24.5, 1000, { day: 5 }); // 23:30 Nov 5 to 00:30 Nov 6
    const days = toDailySteps([overnight], new Date(2026, 10, 5), now, 'healthConnect');
    expect(days).toEqual([
      { source: 'healthConnect', date: '2026-11-05', steps: 500 },
      { source: 'healthConnect', date: '2026-11-06', steps: 500 },
    ]);
  });

  it('returns every day in range, with 0 for days without steps', () => {
    const days = toDailySteps(
      [rec(PHONE, 8, 9, 3000)],
      new Date(2026, 10, 4),
      now,
      'healthConnect',
    );
    expect(days.map((d) => [d.date, d.steps])).toEqual([
      ['2026-11-04', 0],
      ['2026-11-05', 0],
      ['2026-11-06', 3000],
    ]);
  });

  it('ignores steps outside the requested days', () => {
    expect(total([rec(PHONE, 8, 9, 3000, { day: 5 }), rec(PHONE, 8, 9, 2000)])).toBe(2000);
  });
});
