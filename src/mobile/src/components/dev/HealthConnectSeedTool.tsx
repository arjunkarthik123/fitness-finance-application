/**
 * DEV ONLY. Buttons that write and clear Health Connect test data on devices
 * that record no real steps. Only ever load this through `__DEV__`-guarded
 * `require` (see src/app/(tabs)/activity.tsx) so release bundles drop it.
 */
import { useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { AppText, Button, Card } from '@/components/ui';
import { clearSeedData, SEED_DAYS, seedHealthConnect } from '@/integrations/healthConnectSeed';

export function HealthConnectSeedTool({ style }: { style?: StyleProp<ViewStyle> }) {
  const [message, setMessage] = useState<string | null>(null);

  const run = async (action: 'seed' | 'clear') => {
    setMessage(action === 'seed' ? 'Writing test data…' : 'Clearing test data…');
    try {
      if (action === 'seed') {
        const count = await seedHealthConnect();
        setMessage(`Wrote ${count} test records (last ${SEED_DAYS} days).`);
      } else {
        await clearSeedData();
        setMessage('Cleared Flexin test data.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Card dashed style={style} testID="seed-tool">
      <AppText variant="label" tone="todo">
        DEV ONLY: Health Connect test data
      </AppText>
      <Button label="Seed test data" variant="secondary" onPress={() => run('seed')} />
      <Button label="Clear test data" variant="secondary" onPress={() => run('clear')} />
      {message && <AppText tone="muted">{message}</AppText>}
    </Card>
  );
}
