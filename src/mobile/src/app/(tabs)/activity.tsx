import { Link } from 'expo-router';
import { useEffect, useState } from 'react';

import { useBalance } from '@/components/Balance';
import { StepSync } from '@/components/StepSync';
import { AppText, Button, Card, Screen } from '@/components/ui';
import { showDevTools } from '@/config/devTools';
import {
  getHealthConnectStatus,
  hasHealthConnectPermissions,
  healthConnect,
  type HealthConnectStatus,
} from '@/integrations/healthConnect';

// Dev-only tools, behind the dev-tools flag so the release bundler drops them
// entirely and no seed code ships in production.
const HealthConnectSeedTool:
  typeof import('@/components/dev/HealthConnectSeedTool').HealthConnectSeedTool | null =
  showDevTools
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/components/dev/HealthConnectSeedTool').HealthConnectSeedTool
    : null;
const ResetDataTool: typeof import('@/components/dev/ResetDataTool').ResetDataTool | null =
  showDevTools
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/components/dev/ResetDataTool').ResetDataTool
    : null;

type ConnectionState = HealthConnectStatus | 'checking' | 'connected' | 'not-connected' | 'denied';

const MESSAGES: Record<ConnectionState, string> = {
  checking: 'Checking Health Connect…',
  connected: 'Health Connect is connected.',
  'not-connected': 'Health Connect is not connected yet.',
  denied:
    'Flexin needs permission to read your steps and workouts. Tap Connect to try again, or allow it in the Health Connect app.',
  available: 'Health Connect is not connected yet.',
  unavailable: 'Health Connect is not available on this device.',
  'update-required': 'Update the Health Connect app to connect it.',
};

async function checkConnection(): Promise<ConnectionState> {
  const status = await getHealthConnectStatus();
  if (status !== 'available') {
    return status;
  }
  return (await hasHealthConnectPermissions()) ? 'connected' : 'not-connected';
}

export default function ActivityScreen() {
  const [state, setState] = useState<ConnectionState>('checking');
  const { refresh: refreshBalance } = useBalance();
  // Bumped when dev tools change stored data, so StepSync reloads the balance.
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void checkConnection().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = async () => {
    let granted = false;
    try {
      granted = await healthConnect.requestPermissions();
    } finally {
      const next = await checkConnection();
      setState(next === 'not-connected' && !granted ? 'denied' : next);
    }
  };

  const canConnect = state === 'not-connected' || state === 'available' || state === 'denied';

  return (
    <Screen testID="activity-screen">
      <Card>
        <AppText testID="health-connect-status">{MESSAGES[state]}</AppText>
        {canConnect && <Button label="Connect Health Connect" onPress={connect} />}
        <Link href="/health-privacy">
          <AppText variant="label" tone="primary">
            What Flexin reads and why
          </AppText>
        </Link>
      </Card>
      {state === 'connected' && <StepSync key={dataVersion} />}
      {HealthConnectSeedTool && state === 'connected' && <HealthConnectSeedTool />}
      {ResetDataTool && (
        <ResetDataTool
          onChange={() => {
            setDataVersion((v) => v + 1);
            void refreshBalance();
          }}
        />
      )}
    </Screen>
  );
}
