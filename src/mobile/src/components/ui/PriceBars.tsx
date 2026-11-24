import { StyleSheet, View } from 'react-native';

import type { PricePoint } from '@/market';
import { colors } from '@/theme';

type Props = {
  points: PricePoint[];
  /** Only the newest `maxBars` prices are drawn, so long histories still fit. */
  maxBars?: number;
  height?: number;
};

const MIN_BAR_HEIGHT = 4;

/**
 * A bar chart of prices, one bar per tick, drawn with plain Views. Heights are
 * scaled between the lowest and highest price shown; a bar is coloured
 * primary when the price rose (or held) since the tick before, muted when it fell.
 */
export function PriceBars({ points, maxBars = 30, height = 60 }: Props) {
  const shown = points.slice(-maxBars);
  const prices = shown.map((point) => point.price);
  const low = Math.min(...prices);
  const high = Math.max(...prices);

  return (
    <View
      accessibilityLabel={`Price chart of ${shown.length} ticks`}
      style={[styles.chart, { height }]}
      testID="price-bars"
    >
      {shown.map((point, i) => {
        const ratio = high === low ? 0.5 : (point.price - low) / (high - low);
        const up = i === 0 || point.price >= shown[i - 1].price;
        return (
          <View
            key={point.time.getTime()}
            style={[
              styles.bar,
              {
                height: Math.max(MIN_BAR_HEIGHT, ratio * height),
                backgroundColor: up ? colors.primary : colors.textMuted,
              },
            ]}
            testID={up ? 'price-bar-up' : 'price-bar-down'}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { flex: 1, borderRadius: 2 },
});
