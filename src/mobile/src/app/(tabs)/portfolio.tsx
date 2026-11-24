/**
 * Portfolio: current holdings with shares owned, value and lifetime gain.
 * Selling goes through the Transaction Order module, so the FLX is credited.
 */
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ASSETS } from '@/asset';
import { formatFlx, useBalance } from '@/components/Balance';
import { AppText, Button, Card, Screen } from '@/components/ui';
import { showDevTools } from '@/config/devTools';
import { sellAsset } from '@/order';
import { portfolio, type AssetId, type Holding } from '@/portfolio';
import { spacing } from '@/theme';

const PortfolioTestTool:
  typeof import('@/components/dev/PortfolioTestTool').PortfolioTestTool | null = showDevTools
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/components/dev/PortfolioTestTool').PortfolioTestTool
  : null;

const signed = (amount: number) =>
  amount > 0 ? `+${formatFlx(amount)}` : amount < 0 ? `−${formatFlx(-amount)}` : formatFlx(0);
/** A fresh id per order, so a retried sell can't be credited twice. */
const newOrderId = (asset: AssetId) => `${asset}-${Date.now()}`;
const symbolOf = (asset: AssetId) => ASSETS.find((a) => a.id === asset)?.symbol ?? `#${asset}`;

export default function PortfolioScreen() {
  const [holdings, setHoldings] = useState<Holding[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selling, setSelling] = useState<AssetId | null>(null);
  const { refresh } = useBalance();

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
      return () => setMessage(null);
    }, [load]),
  );

  const sell = async (asset: AssetId) => {
    setSelling(asset);
    try {
      const { total } = await sellAsset(asset, 1, newOrderId(asset));
      setMessage(`Sold 1 ${symbolOf(asset)} for ${formatFlx(total)}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSelling(null);
    }
    await Promise.all([load(), refresh()]);
  };

  const total = holdings?.reduce((sum, h) => sum + h.value, 0) ?? 0;
  const lifetime = holdings?.reduce((sum, h) => sum + h.lifetimeGain, 0) ?? 0;

  return (
    <Screen testID="portfolio-screen">
      {holdings === null && <AppText tone="muted">Loading…</AppText>}
      {holdings?.length === 0 && (
        <Card testID="portfolio-empty">
          <AppText variant="label">No assets yet</AppText>
          <AppText tone="muted">Spend the FLX you earn from steps on the Exchange.</AppText>
          <Link href="/exchange" asChild>
            <Button label="Go to the Exchange" />
          </Link>
        </Card>
      )}
      {!!holdings?.length && (
        <Card testID="portfolio-total">
          <AppText variant="label">Total value</AppText>
          <AppText variant="title">{formatFlx(total)}</AppText>
          <AppText tone="muted">Lifetime gain {signed(Math.round(lifetime * 100) / 100)}</AppText>
        </Card>
      )}
      {holdings?.map((h) => (
        <Card key={h.asset} testID={`holding-${symbolOf(h.asset)}`}>
          <View style={styles.row}>
            <View style={styles.info}>
              <AppText variant="label">
                {symbolOf(h.asset)}: {h.qty} {h.qty === 1 ? 'share' : 'shares'}
              </AppText>
              <AppText>
                Value {formatFlx(h.value)} ({formatFlx(h.price)} each)
              </AppText>
              <AppText tone="muted">Lifetime gain {signed(h.lifetimeGain)}</AppText>
            </View>
            <Button
              label={selling === h.asset ? 'Selling…' : 'Sell 1'}
              variant="secondary"
              disabled={selling !== null}
              onPress={() => void sell(h.asset)}
              testID={`sell-${symbolOf(h.asset)}`}
            />
          </View>
        </Card>
      ))}
      {message && <AppText tone="muted">{message}</AppText>}
      {PortfolioTestTool && <PortfolioTestTool onChange={() => void load()} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1, gap: spacing.xs },
});
