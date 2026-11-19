/**
 * DEV ONLY. Shows what the app has stored on the device and wipes it (steps,
 * ledger, balance) so the demo can be re-recorded from zero. "Add 10 test
 * coins" exists to check data survives an app restart before anything real
 * writes to the ledger. Only ever load this through a `__DEV__`-guarded
 * `require` (see src/app/(tabs)/activity.tsx) so release bundles drop it.
 */
import { useEffect, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { AppText, Button, Card } from '@/components/ui';
import { insertLedgerEntry, listDailySteps, resetDatabase, sumLedgerEntries } from '@/persistence';

type Stored = { balance: number; days: number };

async function loadStored(): Promise<Stored> {
  const [balance, days] = await Promise.all([sumLedgerEntries(), listDailySteps()]);
  return { balance, days: days.length };
}

export function ResetDataTool({ style }: { style?: StyleProp<ViewStyle> }) {
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
        {stored ? `Balance: ${stored.balance} coins · Saved days: ${stored.days}` : 'Loading…'}
      </AppText>
      <Button
        label="Add 10 test coins"
        variant="secondary"
        onPress={() =>
          run(
            () =>
              insertLedgerEntry({ key: `dev-test:${Date.now()}`, amount: 10, reason: 'dev-test' }),
            'Added 10 coins.',
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
