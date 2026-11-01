import { Redirect, useLocalSearchParams } from 'expo-router';

import { WireframeScreen } from '@/components/WireframeScreen';

export default function OrderScreen() {
  const { symbol, side } = useLocalSearchParams<{ symbol?: string; side?: string }>();
  // Deep links can arrive with missing or bad params; never guess a side for an order.
  if (!symbol || (side !== 'buy' && side !== 'sell')) {
    return <Redirect href="/exchange" />;
  }
  return (
    <WireframeScreen
      title={`${side === 'sell' ? 'Sell' : 'Buy'} ${symbol}`}
      purpose="Set up a market order using virtual currency."
      todos={['Quantity input', 'Cost preview in virtual currency', 'Confirm and submit order']}
      links={[{ label: 'Back to Exchange', href: '/exchange' }]}
    />
  );
}
