import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Card } from '@/components/ui';
import { healthConnect, HealthConnectReadError } from '@/integrations/healthConnect';
import { toLocalDate } from '@/integrations/sync';
import type { DailySteps } from '@/integrations/types';
import { getBalance } from '@/ledger';
import { creditDailySteps } from '@/rewards';
import { spacing } from '@/theme';

const DAYS = 7;

type Synced = { days: DailySteps[]; credited: number };

/** Balance, Sync button, today's steps and the last 7 days. */
export function StepSync() {
  const [balance, setBalance] = useState<number | null>(null);
  const [synced, setSynced] = useState<Synced | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBalance().then(
      (b) => !cancelled && setBalance(b),
      (e: unknown) => !cancelled && setError(messageOf(e)),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const sync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const since = new Date();
      since.setDate(since.getDate() - (DAYS - 1));
      since.setHours(0, 0, 0, 0);
      const days = await healthConnect.fetchDailySteps(since);
      const result = await creditDailySteps(days);
      setBalance(result.balance);
      setSynced({ days, credited: result.credited });
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setSyncing(false);
    }
  };

  const today = synced?.days.find((d) => d.date === toLocalDate(new Date()));
  const empty = synced !== null && synced.days.every((d) => d.steps === 0);

  return (
    <>
      <Card testID="balance">
        <AppText variant="label">Balance</AppText>
        <AppText variant="title">{balance === null ? '…' : `${balance.toFixed(2)} FLX`}</AppText>
        {synced && (
          <AppText tone="muted" testID="credited">
            {synced.credited > 0
              ? `+${synced.credited.toFixed(2)} FLX from this sync`
              : 'No new steps since the last sync.'}
          </AppText>
        )}
      </Card>

      <Card testID="steps">
        <Button label={syncing ? 'Syncing…' : 'Sync steps'} onPress={sync} disabled={syncing} />
        {error && <AppText tone="todo">{error}</AppText>}
        {!synced && !error && (
          <AppText tone="muted">Tap Sync to read your steps from Health Connect.</AppText>
        )}
        {empty && (
          <AppText tone="muted">
            No steps in Health Connect for the last {DAYS} days. Check that your step app writes to
            Health Connect.
          </AppText>
        )}
        {synced && !empty && (
          <>
            <AppText variant="label">Today</AppText>
            <AppText variant="title" testID="today-steps">
              {(today?.steps ?? 0).toLocaleString()} steps
            </AppText>
            {!!today?.unverifiedSteps && (
              <AppText tone="muted">
                {today.unverifiedSteps.toLocaleString()} steps not counted: recorded faster than a
                person can walk.
              </AppText>
            )}
            <View style={{ gap: spacing.xs }}>
              <AppText variant="label">Last {DAYS} days</AppText>
              {[...synced.days].reverse().map((d) => (
                <AppText key={d.date}>
                  {d.date}: {d.steps.toLocaleString()}
                </AppText>
              ))}
            </View>
          </>
        )}
      </Card>
    </>
  );
}

function messageOf(e: unknown): string {
  if (e instanceof HealthConnectReadError) return e.message;
  return `Sync failed: ${e instanceof Error ? e.message : String(e)}`;
}
