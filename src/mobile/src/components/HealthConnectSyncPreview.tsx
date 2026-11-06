import { useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { AppText, Button, Card } from '@/components/ui';
import { healthConnect } from '@/integrations/healthConnect';
import type { ActivitySample, DailySteps } from '@/integrations/types';

const DAYS = 7;

type Result = { days: DailySteps[]; activities: ActivitySample[] };

/**
 * Temporary readout of what Flexin reads from Health Connect, for checking #327
 * on a device. TODO(#329): replace with the real Activity screen and send the
 * result to the backend sync endpoint.
 */
export function HealthConnectSyncPreview({ style }: { style?: StyleProp<ViewStyle> }) {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const sync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const since = new Date();
      since.setDate(since.getDate() - (DAYS - 1));
      since.setHours(0, 0, 0, 0);
      const [days, activities] = await Promise.all([
        healthConnect.fetchDailySteps(since),
        healthConnect.fetchActivities(since),
      ]);
      setResult({ days, activities });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card style={style} testID="sync-preview">
      <Button label={syncing ? 'Syncing…' : 'Sync from Health Connect'} onPress={sync} />
      {error && <AppText tone="todo">{error}</AppText>}
      {result && (
        <>
          <AppText variant="label">Steps, last {DAYS} days</AppText>
          {[...result.days].reverse().map((d) => (
            <AppText key={d.date}>
              {d.date}: {d.steps.toLocaleString()}
            </AppText>
          ))}
          <AppText variant="label">Workouts: {result.activities.length}</AppText>
          {result.activities.map((a) => (
            <AppText key={a.id} tone="muted">
              {a.startTime.toLocaleDateString()} {a.type},{' '}
              {Math.round((a.endTime.getTime() - a.startTime.getTime()) / 60_000)} min
            </AppText>
          ))}
        </>
      )}
    </Card>
  );
}
