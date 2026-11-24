/**
 * DEV ONLY. Adds test steps for today so the goal's reward tiers can be tried
 * on an emulator with no real steps. The steps go through creditDailySteps
 * like a real sync, so they also earn the usual step reward. Only ever load
 * this through the `showDevTools` flag (see src/config/devTools.ts).
 */
import { useState } from 'react';

import { AppText, Button, Card } from '@/components/ui';
import { toLocalDate } from '@/integrations/sync';
import { getDailySteps } from '@/persistence';
import { creditDailySteps } from '@/rewards';

const STEP = 5_000;

export function GoalTestStepsTool({ onChange }: { onChange: () => void }) {
  const [message, setMessage] = useState<string | null>(null);

  const add = async () => {
    try {
      const day = { source: 'garmin' as const, date: toLocalDate(new Date()) };
      const stored = (await getDailySteps(day))?.steps ?? 0;
      const { credited } = await creditDailySteps([
        { ...day, steps: stored + STEP, unverifiedSteps: 0 },
      ]);
      setMessage(
        `Today: ${(stored + STEP).toLocaleString('en-US')} test steps (+${credited.toFixed(2)} FLX step reward).`,
      );
      onChange();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Card dashed testID="goal-test-steps-tool">
      <AppText variant="label" tone="todo">
        DEV ONLY: Test steps
      </AppText>
      <Button
        label={`Add ${STEP.toLocaleString('en-US')} steps today`}
        variant="secondary"
        onPress={add}
        testID="add-test-steps"
      />
      {message && <AppText tone="muted">{message}</AppText>}
    </Card>
  );
}
