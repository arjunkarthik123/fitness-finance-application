/**
 * Investment detail: one asset's current price, its growth since the market
 * started, a bar chart of its price history and its most recent ticks.
 * Opened by tapping an asset on the Exchange.
 */
import { Link, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { asset, type Asset } from '@/asset';
import { AppText, Button, Card, PriceBars, Screen } from '@/components/ui';
import { getHistory, type PricePoint } from '@/market';
import { spacing } from '@/theme';

const RECENT_TICKS = 10;

const signed = (percent: number) => `${percent >= 0 ? '+' : '−'}${Math.abs(percent).toFixed(1)}%`;

export default function InvestmentDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  // undefined: loading; null: no asset has this symbol.
  const [item, setItem] = useState<Asset | null | undefined>(undefined);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const found = (await asset.getAssets()).find((a) => a.symbol === symbol) ?? null;
      // Fetch the history before showing the asset, so it never renders without one.
      if (found) setHistory(await getHistory(found.id));
      setItem(found);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }, [symbol]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (item === undefined) {
    return (
      <Screen testID="invest-loading">
        <AppText tone="muted">{message ?? 'Loading…'}</AppText>
      </Screen>
    );
  }

  if (item === null) {
    return (
      <Screen testID="asset-not-found">
        <Stack.Screen options={{ title: 'Not found' }} />
        <AppText variant="heading">Asset not found</AppText>
        <AppText tone="muted">No asset has the symbol {symbol}.</AppText>
        <Link href="/exchange" asChild>
          <Button label="Back to Exchange" variant="secondary" />
        </Link>
      </Screen>
    );
  }

  // The last history entry is the current price.
  const first = history[0]?.price ?? item.startPrice;
  const current = history.at(-1)?.price ?? item.startPrice;
  const change = ((current - first) / first) * 100;

  // The newest ticks first, each with its change from the tick before.
  const recent = history
    .map((point, i) => ({
      point,
      change: i === 0 ? null : ((point.price - history[i - 1].price) / history[i - 1].price) * 100,
    }))
    .slice(-RECENT_TICKS)
    .reverse();

  return (
    <Screen testID={`invest-${item.symbol}`}>
      <Stack.Screen options={{ title: item.symbol }} />

      <AppText variant="heading">{item.name}</AppText>
      <AppText tone="muted">
        {item.type} · Yield {item.yield}%
      </AppText>

      <Card>
        <AppText variant="label">{current.toFixed(2)} FLX</AppText>
        <AppText tone="muted" testID="growth">
          Started at {first.toFixed(2)} FLX · {signed(change)}
        </AppText>
      </Card>

      <Card>
        <AppText variant="label">Price history</AppText>
        <PriceBars points={history} />
      </Card>

      <Card>
        <AppText variant="label">Recent ticks</AppText>
        {recent.map(({ point, change: tickChange }) => (
          <View key={point.time.getTime()} style={styles.row} testID="tick-row">
            <AppText tone="muted">{point.time.toLocaleTimeString()}</AppText>
            <AppText>{point.price.toFixed(2)}</AppText>
            <AppText tone="muted">{tickChange === null ? 'start' : signed(tickChange)}</AppText>
          </View>
        ))}
      </Card>

      <View style={styles.actions}>
        <Link href={{ pathname: '/order', params: { symbol: item.symbol, side: 'buy' } }} asChild>
          <Button label="Buy" style={styles.action} />
        </Link>
        <Link href={{ pathname: '/order', params: { symbol: item.symbol, side: 'sell' } }} asChild>
          <Button label="Sell" variant="secondary" style={styles.action} />
        </Link>
      </View>

      {message && <AppText tone="muted">{message}</AppText>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { flex: 1 },
});
