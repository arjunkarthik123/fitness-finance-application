/**
 * TEST SCREEN for the Portfolio module: shows the current holdings, each with
 * shares owned, value and lifetime gain. The test buttons call addUnits and
 * removeUnits directly at the current market price, so they don't move any FLX.
 * Replace this with the real Portfolio screen once Exchange and Transaction
 * Order exist.
 */
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ASSETS } from '@/asset';
import { AppText, Button, Card, Screen } from '@/components/ui';
import { getPrice } from '@/market';
import { addUnits, portfolio, removeUnits, type AssetId, type Holding } from '@/portfolio';
import { spacing } from '@/theme';

const flx = (amount: number) => `${amount.toFixed(2)} FLX`;
const signed = (amount: number) =>
  amount > 0 ? `+${flx(amount)}` : amount < 0 ? `−${flx(-amount)}` : flx(0);
const symbolOf = (asset: AssetId) => ASSETS.find((a) => a.id === asset)?.symbol ?? `#${asset}`;

export default function PortfolioTestScreen() {
  const [holdings, setHoldings] = useState<Holding[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setHoldings(await portfolio.getHoldings());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const trade = async (asset: AssetId, side: 'buy' | 'sell') => {
    try {
      const { price } = await getPrice(asset);
      if (side === 'buy') await addUnits(asset, 1, price);
      else await removeUnits(asset, 1, price);
      setMessage(`${side === 'buy' ? 'Added' : 'Sold'} 1 ${symbolOf(asset)} at ${flx(price)}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
    await load();
  };

  const total = holdings?.reduce((sum, h) => sum + h.value, 0) ?? 0;
  const lifetime = holdings?.reduce((sum, h) => sum + h.lifetimeGain, 0) ?? 0;

  return (
    <Screen testID="portfolio-test-screen">
      <Stack.Screen options={{ title: 'Portfolio (test)' }} />

      <AppText variant="heading">Current holdings</AppText>
      {holdings === null && <AppText tone="muted">Loading…</AppText>}
      {holdings?.length === 0 && <AppText tone="muted">No holdings yet.</AppText>}
      {holdings?.map((h) => (
        <Card key={h.asset} testID={`holding-${symbolOf(h.asset)}`}>
          <AppText variant="label">
            {symbolOf(h.asset)}: {h.qty} {h.qty === 1 ? 'share' : 'shares'}
          </AppText>
          <AppText>
            Value {flx(h.value)} ({flx(h.price)} each)
          </AppText>
          <AppText>Lifetime gain {signed(h.lifetimeGain)}</AppText>
        </Card>
      ))}
      {!!holdings?.length && (
        <AppText tone="muted">
          Total {flx(total)} · Lifetime gain {signed(Math.round(lifetime * 100) / 100)}
        </AppText>
      )}

      <Card dashed>
        <AppText variant="label" tone="todo">
          TEST: add or sell shares (no FLX moves)
        </AppText>
        {ASSETS.map((a) => (
          <View key={a.id} style={styles.row}>
            <AppText style={styles.symbol}>{a.symbol}</AppText>
            <Button label="Buy 1" onPress={() => trade(a.id, 'buy')} testID={`buy-${a.symbol}`} />
            <Button
              label="Sell 1"
              variant="secondary"
              onPress={() => trade(a.id, 'sell')}
              testID={`sell-${a.symbol}`}
            />
          </View>
        ))}
        {message && <AppText tone="muted">{message}</AppText>}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  symbol: { flex: 1 },
});
