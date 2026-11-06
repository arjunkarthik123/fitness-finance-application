import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card } from '@/components/ui';
import { WireframeScreen } from '@/components/WireframeScreen';
import {
  getHealthConnectStatus,
  hasHealthConnectPermissions,
  healthConnect,
  type HealthConnectStatus,
} from '@/integrations/healthConnect';
import { colors, spacing } from '@/theme';

// Dev-only seed tool. The __DEV__ guard around require() lets the release bundler
// drop the module entirely, so no seed code ships in production.
const HealthConnectSeedTool:
  typeof import('@/components/dev/HealthConnectSeedTool').HealthConnectSeedTool | null = __DEV__
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/components/dev/HealthConnectSeedTool').HealthConnectSeedTool
  : null;

type ConnectionState = HealthConnectStatus | 'checking' | 'connected' | 'not-connected';

const MESSAGES: Record<ConnectionState, string> = {
  checking: 'Checking Health Connect…',
  connected: 'Health Connect is connected.',
  'not-connected': 'Health Connect is not connected yet.',
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

// TODO(#329): replace with the full Activity screen (sync, steps, history).
export default function ActivityScreen() {
  const [state, setState] = useState<ConnectionState>('checking');

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
    try {
      await healthConnect.requestPermissions();
    } finally {
      setState(await checkConnection());
    }
  };

  const canConnect = state === 'not-connected' || state === 'available';

  return (
    <View style={styles.screen}>
      <Card style={styles.card}>
        <AppText testID="health-connect-status">{MESSAGES[state]}</AppText>
        {canConnect && <Button label="Connect Health Connect" onPress={connect} />}
        <Link href="/health-privacy">
          <AppText variant="label" tone="primary">
            What Flexin reads and why
          </AppText>
        </Link>
      </Card>
      {HealthConnectSeedTool && state === 'connected' && (
        <HealthConnectSeedTool style={styles.card} />
      )}
      <WireframeScreen
        title="Activity"
        purpose="Track workouts and see the virtual currency they earned."
        todos={[
          'Recent workouts from device, Health Connect, Strava, Garmin',
          'Currency earned per workout',
          'Connected devices',
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    margin: spacing.lg,
    marginBottom: 0,
  },
});
