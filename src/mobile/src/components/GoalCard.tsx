import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card } from '@/components/ui';
import { collectReward, getGoalStatus, REWARD_TIERS, type GoalStatus } from '@/goals';
import { colors, radius, spacing } from '@/theme';

const flx = (amount: number) => `${amount.toFixed(2)} FLX`;
const pct = (share: number) => `${Math.floor(share * 100)}%`;
const count = (n: number) => n.toLocaleString('en-US');

/**
 * The PoC's single hardcoded goal: progress, the reward tier reached, and a
 * button to collect it. `refreshKey` reloads it after steps change elsewhere.
 */
export function GoalCard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [status, setStatus] = useState<GoalStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await getGoalStatus());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      // refreshKey only exists to re-run this.
    }, [load, refreshKey]), // eslint-disable-line react-hooks/exhaustive-deps
  );

  const collect = async () => {
    try {
      const { credited, balance } = await collectReward();
      setMessage(`Collected ${flx(credited)}. Balance ${flx(balance)}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
    await load();
  };

  if (!status) {
    return (
      <Card testID="goal-card">
        <AppText tone="muted">{message ?? 'Loading goal…'}</AppText>
      </Card>
    );
  }

  const { goal, progress, completion, multiplier, reward, nextTier, locked, collected } = status;

  return (
    <Card testID="goal-card">
      <AppText variant="heading">{goal.title}</AppText>
      <AppText tone="muted">
        {goal.period.start} to {goal.period.end}
      </AppText>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.floor(completion * 100) }}
      >
        <View style={[styles.fill, { width: `${completion * 100}%` }]} />
      </View>
      <AppText testID="goal-progress">
        {count(progress)} / {count(goal.target)} steps · {pct(completion)}
      </AppText>

      <View style={styles.tiers}>
        {[...REWARD_TIERS].reverse().map((tier) => {
          const current = tier.multiplier === multiplier;
          const reached = completion >= tier.minCompletion;
          return (
            <View
              key={tier.minCompletion}
              style={[styles.tier, reached && styles.tierReached, current && styles.tierCurrent]}
            >
              <AppText variant="label" tone={current ? 'onPrimary' : 'default'}>
                {pct(tier.minCompletion)}
              </AppText>
              <AppText tone={current ? 'onPrimary' : 'muted'}>{tier.multiplier}×</AppText>
            </View>
          );
        })}
      </View>

      {locked ? (
        <AppText testID="goal-reward">Collected {flx(collected ?? 0)}. This goal is done.</AppText>
      ) : (
        <>
          <AppText testID="goal-reward">
            {reward > 0
              ? `Reward now: ${flx(reward)} (${multiplier}× of ${flx(goal.baseReward)})`
              : `No reward yet. Base reward ${flx(goal.baseReward)}.`}
          </AppText>
          {nextTier && (
            <AppText tone="muted">
              {count(nextTier.progressNeeded)} more steps to reach {nextTier.multiplier}× (
              {flx(goal.baseReward * nextTier.multiplier)})
            </AppText>
          )}
          {reward > 0 && (
            <>
              <Button label={`Collect ${flx(reward)}`} onPress={collect} testID="collect-goal" />
              <AppText tone="muted">Collecting ends the goal for this week.</AppText>
            </>
          )}
        </>
      )}
      {message && <AppText tone="muted">{message}</AppText>}
    </Card>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 12,
    borderRadius: radius.md,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.primary },
  tiers: { flexDirection: 'row', gap: spacing.xs },
  tier: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  tierReached: { borderColor: colors.primary },
  tierCurrent: { backgroundColor: colors.primary },
});
