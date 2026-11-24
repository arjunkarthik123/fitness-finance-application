import { useEffect, useState } from 'react';

import { formatFlx, useBalance } from '@/components/Balance';
import { GoalCard } from '@/components/GoalCard';
import { AppText, Button, Card, Screen } from '@/components/ui';
import { showDevTools } from '@/config/devTools';
import { currentGoal } from '@/goals';
import {
  getHealthConnectStatus,
  hasHealthConnectPermissions,
  healthConnect,
} from '@/integrations/healthConnect';
import { creditDailySteps } from '@/rewards';

// Dev-only tool, behind the dev-tools flag so release bundles drop it.
const GoalTestStepsTool:
  typeof import('@/components/dev/GoalTestStepsTool').GoalTestStepsTool | null = showDevTools
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/components/dev/GoalTestStepsTool').GoalTestStepsTool
  : null;

async function canSync(): Promise<boolean> {
  return (await getHealthConnectStatus()) === 'available' && (await hasHealthConnectPermissions());
}

/** PoC Goals screen: one hardcoded weekly step goal. No creating or editing goals yet. */
export default function GoalsScreen() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { refresh: refreshBalance } = useBalance();
  const refresh = () => {
    setRefreshKey((k) => k + 1);
    void refreshBalance();
  };

  useEffect(() => {
    let cancelled = false;
    canSync().then(
      (ok) => !cancelled && setConnected(ok),
      () => !cancelled && setConnected(false),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const sync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const since = new Date(`${currentGoal().period.start}T00:00:00`);
      const { credited } = await creditDailySteps(await healthConnect.fetchDailySteps(since));
      setMessage(`Synced. Step rewards +${formatFlx(credited)}.`);
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Screen testID="goals-screen">
      <GoalCard refreshKey={refreshKey} />
      <Card>
        {connected ? (
          <Button label={syncing ? 'Syncing…' : 'Sync steps from Health Connect'} onPress={sync} />
        ) : (
          <AppText tone="muted">Connect Health Connect on the Activity tab to sync steps.</AppText>
        )}
        {message && <AppText tone="muted">{message}</AppText>}
      </Card>
      {GoalTestStepsTool && <GoalTestStepsTool onChange={refresh} />}
    </Screen>
  );
}
