/**
 * Turns raw step records from one or more source apps into daily step totals
 * without double counting. Pure: no Health Connect dependency, fully testable.
 *
 * Health Connect's aggregate query dedupes sources but cannot drop manual
 * entries, so we read raw records and dedupe ourselves:
 *
 * 1. Drop manual entries and physically impossible records.
 * 2. Split each short ("fine") record over 15-minute buckets in proportion to
 *    time overlap; per bucket, sum each source and keep the highest source. Two
 *    devices recording the same walk count once; phone-in-the-morning plus
 *    watch-in-the-afternoon both count.
 * 3. Long ("coarse") records only add the steps the fine data in their span
 *    has not already counted, spread over their span. Spreading a long record
 *    evenly would otherwise let it "win" buckets where a finer source simply
 *    had no records, inflating the total.
 * 4. Sum each local day's buckets.
 */
import type { DailySteps, FitnessSource } from './types';
import { toLocalDate } from './sync';

export const BUCKET_MS = 15 * 60 * 1000;

/** Records longer than this are coarse (step 3). */
export const COARSE_RECORD_MS = 60 * 60 * 1000;

/** Faster than an elite sprint cadence: treated as invalid data, not steps. */
export const MAX_STEPS_PER_MINUTE = 300;

export type StepInterval = {
  /** Package name of the app that wrote the record (Health Connect `dataOrigin`). */
  origin: string;
  start: Date;
  end: Date;
  count: number;
  manualEntry: boolean;
};

/** Why a record was not counted; exposed so the UI and tests can explain it. */
export type RejectReason = 'manual-entry' | 'invalid-interval' | 'implausible-rate';

export function rejectReason(interval: StepInterval): RejectReason | null {
  if (interval.manualEntry) return 'manual-entry';
  const ms = interval.end.getTime() - interval.start.getTime();
  if (ms <= 0 || !Number.isFinite(interval.count) || interval.count < 0) {
    return 'invalid-interval';
  }
  if (interval.count / (ms / 60_000) > MAX_STEPS_PER_MINUTE) return 'implausible-rate';
  return null;
}

/** [bucketIndex, overlapMs] for every 15-minute bucket the interval touches. */
function overlaps(start: number, end: number): [number, number][] {
  const result: [number, number][] = [];
  for (let b = Math.floor(start / BUCKET_MS); b * BUCKET_MS < end; b++) {
    const overlap = Math.min(end, (b + 1) * BUCKET_MS) - Math.max(start, b * BUCKET_MS);
    if (overlap > 0) result.push([b, overlap]);
  }
  return result;
}

/** Step count per bucket index after deduplicating sources (steps 1 to 3). */
export function bucketSteps(intervals: StepInterval[]): Map<number, number> {
  const valid = intervals.filter((i) => rejectReason(i) === null);
  const isCoarse = (i: StepInterval) => i.end.getTime() - i.start.getTime() > COARSE_RECORD_MS;

  // Step 2: fine records, highest source per bucket.
  const perSource = new Map<number, Map<string, number>>();
  for (const i of valid.filter((v) => !isCoarse(v))) {
    const start = i.start.getTime();
    const end = i.end.getTime();
    for (const [b, overlap] of overlaps(start, end)) {
      const sources = perSource.get(b) ?? new Map<string, number>();
      sources.set(i.origin, (sources.get(i.origin) ?? 0) + (i.count * overlap) / (end - start));
      perSource.set(b, sources);
    }
  }
  const buckets = new Map<number, number>();
  for (const [b, sources] of perSource) {
    buckets.set(b, Math.max(...sources.values()));
  }

  // Step 3: coarse records add only what the buckets in their span are missing.
  const coarse = valid.filter(isCoarse).sort((a, b) => a.start.getTime() - b.start.getTime());
  for (const i of coarse) {
    const start = i.start.getTime();
    const end = i.end.getTime();
    const span = overlaps(start, end);
    const counted = span.reduce(
      (sum, [b, overlap]) => sum + ((buckets.get(b) ?? 0) * overlap) / BUCKET_MS,
      0,
    );
    const remainder = i.count - counted;
    if (remainder <= 0) continue;
    // Prefer buckets with no data yet; if every bucket has some, spread over all.
    const empty = span.filter(([b]) => !buckets.get(b));
    const targets = empty.length > 0 ? empty : span;
    const targetMs = targets.reduce((sum, [, overlap]) => sum + overlap, 0);
    for (const [b, overlap] of targets) {
      buckets.set(b, (buckets.get(b) ?? 0) + (remainder * overlap) / targetMs);
    }
  }
  return buckets;
}

/**
 * Daily totals for every local day from `since` to `now` inclusive (days with
 * no steps are 0), deduplicated across source apps.
 */
export function toDailySteps(
  intervals: StepInterval[],
  since: Date,
  now: Date,
  source: FitnessSource,
): DailySteps[] {
  const totals = new Map<string, number>();
  for (const day = new Date(since); toLocalDate(day) <= toLocalDate(now);) {
    totals.set(toLocalDate(day), 0);
    day.setDate(day.getDate() + 1);
    day.setHours(0, 0, 0, 0);
  }
  for (const [b, steps] of bucketSteps(intervals)) {
    const date = toLocalDate(new Date(b * BUCKET_MS));
    if (totals.has(date)) totals.set(date, (totals.get(date) ?? 0) + steps);
  }
  return [...totals].map(([date, steps]) => ({ source, date, steps: Math.round(steps) }));
}
