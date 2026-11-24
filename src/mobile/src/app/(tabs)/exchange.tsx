import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { asset, type Asset } from '@/asset';
import { formatFlx, useBalance } from '@/components/Balance';
import { AppText, Button, Card, Screen } from '@/components/ui';
import { getPrice, tick } from '@/market';
import { colors, spacing } from '@/theme';

export default function ExchangeScreen() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState('');
  const [prices, setPrices] = useState<Record<number, number>>({});
  const [message, setMessage] = useState<string | null>(null);
  const { refresh } = useBalance();

  const load = useCallback(async () => {
    try {
      const catalogue = await asset.getAssets();
      setAssets(catalogue);
      const points = await Promise.all(catalogue.map((item) => getPrice(item.id)));
      setPrices(Object.fromEntries(points.map((point) => [point.asset, point.price])));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      // Leaving the screen clears its message, such as the last market move.
      return () => setMessage(null);
    }, [load]),
  );

  const visible = assets.filter((item) =>
    `${item.symbol} ${item.name} ${item.type}`.toLowerCase().includes(search.toLowerCase()),
  );

  const simulateTick = () => {
    const moves = tick()
      .map(({ asset: id, factor }) => {
        const symbol = assets.find((item) => item.id === id)?.symbol ?? `#${id}`;
        return `${symbol} ×${factor.toFixed(2)}`;
      })
      .join(', ');
    setMessage(`Market prices moved: ${moves}.`);
    void load();
  };

  return (
    <Screen testID="exchange-screen">
      <Stack.Screen options={{ title: 'Exchange' }} />
      <AppText variant="heading">Financial Asset Catalogue</AppText>
      <View style={styles.searchRow}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search for an asset..."
          style={styles.search}
          testID="asset-search"
        />
        <Button
          label="Sim"
          variant="secondary"
          accessibilityLabel="Simulate a market tick"
          onPress={simulateTick}
          testID="market-tick"
        />
      </View>
      {message && <AppText tone="muted">{message}</AppText>}
      {visible.map((item) => (
        <Card key={item.id} testID={`asset-${item.symbol}`}>
          <View style={styles.assetRow}>
            <View style={styles.assetInfo}>
              <AppText variant="label">
                {item.symbol} · {item.name}
              </AppText>
              <AppText tone="muted">
                {item.type} · Yield {item.yield}%
              </AppText>
              <AppText>{formatFlx(prices[item.id] ?? item.startPrice)}</AppText>
              <AppText tone="muted">{item.available} available</AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={item.available === 0}
              style={[styles.buy, item.available === 0 && styles.disabled]}
              onPress={() =>
                void (async () => {
                  try {
                    const { buyAsset } = await import('@/order');
                    const { total } = await buyAsset(item.id, 1, `${item.id}-${Date.now()}`);
                    setMessage(`Bought 1 ${item.symbol} for ${formatFlx(total)}.`);
                    await Promise.all([load(), refresh()]);
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : String(error));
                  }
                })()
              }
              testID={`buy-${item.symbol}`}
            >
              <AppText variant="label" tone="onPrimary">
                {item.available === 0 ? 'Sold out' : 'Buy'}
              </AppText>
            </Pressable>
          </View>
        </Card>
      ))}
      {visible.length === 0 && <AppText tone="muted">No assets match your search.</AppText>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  search: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
  },
  assetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  assetInfo: { flex: 1, gap: spacing.xs },
  buy: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  disabled: { opacity: 0.5 },
});
