/**
 * DEV ONLY. Adds or removes shares straight through the Portfolio module at
 * the current market price, without moving any FLX, to test holdings and
 * lifetime gain. Real trades go through @/order. Only ever load this through
 * the `showDevTools` flag (see src/config/devTools.ts).
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ASSETS } from '@/asset';
import { formatFlx } from '@/components/Balance';
import { AppText, Button, Card } from '@/components/ui';
import { getPrice } from '@/market';
import { addUnits, removeUnits, type AssetId } from '@/portfolio';
import { spacing } from '@/theme';

export function PortfolioTestTool({ onChange }: { onChange: () => void }) {
  const [message, setMessage] = useState<string | null>(null);

  const trade = async (asset: AssetId, side: 'add' | 'remove') => {
    const symbol = ASSETS.find((a) => a.id === asset)?.symbol ?? `#${asset}`;
    try {
      const { price } = await getPrice(asset);
      if (side === 'add') await addUnits(asset, 1, price);
      else await removeUnits(asset, 1, price);
      setMessage(`${side === 'add' ? 'Added' : 'Removed'} 1 ${symbol} at ${formatFlx(price)}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
    onChange();
  };

  return (
    <Card dashed testID="portfolio-test-tool">
      <AppText variant="label" tone="todo">
        DEV ONLY: Add or remove shares (no FLX moves)
      </AppText>
      {ASSETS.map((a) => (
        <View key={a.id} style={styles.row}>
          <AppText style={styles.symbol}>{a.symbol}</AppText>
          <Button label="Add 1" onPress={() => trade(a.id, 'add')} testID={`add-${a.symbol}`} />
          <Button
            label="Remove 1"
            variant="secondary"
            onPress={() => trade(a.id, 'remove')}
            testID={`remove-${a.symbol}`}
          />
        </View>
      ))}
      {message && <AppText tone="muted">{message}</AppText>}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  symbol: { flex: 1 },
});
