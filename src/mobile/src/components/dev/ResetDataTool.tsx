/**
 * DEV ONLY. Shows what the app has stored on the device and wipes it (steps,
 * ledger, balance) so the demo can be re-recorded from zero. "Add 10 test
 * FLX" exists to check data survives an app restart before anything real
 * writes to the ledger. Only ever load this through a `__DEV__`-guarded
 * `require` (see src/app/(tabs)/activity.tsx) so release bundles drop it.
 */
import { useEffect, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { AppText, Button, Card } from '@/components/ui';
import { addBalance, getBalance } from '@/ledger';
import { listDailySteps, resetDatabase } from '@/persistence';

type Stored = { balance: number; days: number };

async function loadStored(): Promise<Stored> {
  const [balance, days] = await Promise.all([getBalance(), listDailySteps()]);
  return { balance, days: days.length };
}

export function ResetDataTool({
  style,
  onChange,
}: {
  style?: StyleProp<ViewStyle>;
  /** Called after the stored data changes. */
  onChange?: () => void;
}) {
  const [stored, setStored] = useState<Stored | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadStored().then(
      (next) => !cancelled && setStored(next),
      (error: unknown) => !cancelled && setMessage(String(error)),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      setStored(await loadStored());
      setMessage(done);
      onChange?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Card dashed style={style} testID="reset-data-tool">
      <AppText variant="label" tone="todo">
        DEV ONLY: App data
      </AppText>
      <AppText testID="stored-data">
        {stored
          ? `Balance: ${stored.balance.toFixed(2)} FLX · Saved days: ${stored.days}`
          : 'Loading…'}
      </AppText>
      <Button
        label="Add 10 test FLX"
        variant="secondary"
        onPress={() =>
          run(
            () => addBalance(10, { key: `dev-test:${Date.now()}`, reason: 'dev-test' }),
            'Added 10 FLX.',
          )
        }
      />
      <Button
        label="Reset data"
        variant="secondary"
        onPress={() => run(resetDatabase, 'All app data on this device was deleted.')}
      />
      {message && <AppText tone="muted">{message}</AppText>}
    </Card>
  );
}
